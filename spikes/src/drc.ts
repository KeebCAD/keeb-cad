// keeb-cad's own design rule check of a RouteSet on a RoutingInput, per net class (R7, AD-20).
// Pure. Rules come only from `input.netClasses` and `input.rules`.
import Flatbush from 'flatbush'
import type { Point } from '../../fixtures/src/kicad-pcb'
import type { CopperLayer, RoutingInput } from './routing-input'
import { fixedCopperNets, type DrcClass, type DrcKind, type RouteSet } from './route-set'
import {
  edgeBounds,
  edgeGap,
  padShape,
  shapeBounds,
  shapeGap,
  traceShape,
  viaShape,
  type Shape,
} from './shapes'

export interface DrcViolation {
  kind: DrcKind
  /** The class whose rule failed. */
  class: DrcClass
  /**
   * Pad ids, connection ids, `fixed:<i>`, `via:<i>`, obstacle ids (`obstacleIds`, NPTH holes
   * included), or `edge:<i>`.
   */
  items: string[]
  required: number
  actual: number
  at: Point
}

export interface DrcReport {
  violations: DrcViolation[]
  byClass: Record<DrcClass, number>
  byKind: Record<DrcKind, number>
}

/** Float noise only: KiCad compares whole nanometres. */
const EPS = 1e-9

interface Copper {
  id: string
  net: string | undefined
  layers: CopperLayer[]
  shape: Shape
  width?: number
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/**
 * One id per `input.obstacles` entry: `obstacle:<ref>.<pin>` (`-` for an unnumbered pad); a
 * repeat gets `.2`, `.3`… in file order, as pad ids do.
 */
export function obstacleIds(input: RoutingInput): string[] {
  const seen = new Map<string, number>()
  return input.obstacles.map((o) => {
    const base = `obstacle:${o.reference}.${o.pin || '-'}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}.${n}`
  })
}

export function drc(input: RoutingInput, routes: RouteSet): DrcReport {
  const classOfNet = new Map<string, { name: DrcClass; clearance: number; traceWidth: number }>()
  for (const c of input.netClasses) for (const n of c.nets) classOfNet.set(n, c)
  // Netless copper takes the strictest clearance, as KiCad's Default class does in writeProject.
  const netless = { name: 'default' as const, clearance: input.rules.engineClearance, traceWidth: 0 }
  const classOf = (net: string | undefined) => {
    if (net === undefined) return netless
    const c = classOfNet.get(net)
    if (!c) throw new Error(`Net ${net} is in no net class`)
    return c
  }

  const copper: Copper[] = []
  for (const p of input.pads) {
    copper.push({ id: p.id, net: p.net, layers: p.layers, shape: padShape(p) })
  }
  const obstacleId = obstacleIds(input)
  const holes: Array<{ id: string; shape: Shape }> = []
  for (const [i, o] of input.obstacles.entries()) {
    if (o.type === 'np_thru_hole') {
      const drill = o.drill ?? o.size
      holes.push({ id: obstacleId[i]!, shape: padShape({ ...o, shape: drill.w === drill.h ? 'circle' : 'oval', size: drill }) })
      continue
    }
    copper.push({ id: obstacleId[i]!, net: undefined, layers: o.layers, shape: padShape(o) })
  }
  const fixedNets = fixedCopperNets(input)
  for (const [i, t] of input.fixedCopper.entries()) {
    copper.push({
      id: `fixed:${i}`,
      net: fixedNets[i],
      layers: [t.layer],
      shape: traceShape(t.start, t.end, t.width),
      width: t.width,
    })
  }
  for (const t of routes.traces) {
    for (let k = 1; k < t.points.length; k++) {
      copper.push({
        id: t.connection,
        net: t.net,
        layers: [t.layer],
        shape: traceShape(t.points[k - 1]!, t.points[k]!, t.width),
        width: t.width,
      })
    }
  }
  for (const [i, v] of routes.vias.entries()) {
    copper.push({ id: `via:${i}`, net: v.net, layers: [...input.rules.layers], shape: viaShape(v.at, v.diameter) })
  }

  const violations: DrcViolation[] = []

  // Trace width below the class width.
  for (const c of copper) {
    if (c.width === undefined || c.net === undefined) continue
    const cls = classOf(c.net)
    if (c.width < cls.traceWidth - EPS) {
      const s = c.shape.core
      violations.push({
        kind: 'track-width',
        class: cls.name,
        items: [c.id],
        required: cls.traceWidth,
        actual: c.width,
        at: s.kind === 'segment' ? mid(s.a, s.b) : { x: 0, y: 0 },
      })
    }
  }

  // Copper to copper on a shared layer, different nets. Flatbush broad phase.
  const maxClearance = Math.max(netless.clearance, ...input.netClasses.map((c) => c.clearance))
  const boxes = copper.map((c) => shapeBounds(c.shape))
  if (copper.length > 0) {
    const index = new Flatbush(copper.length)
    for (const b of boxes) index.add(b.minX, b.minY, b.maxX, b.maxY)
    index.finish()
    for (const [i, a] of copper.entries()) {
      const b = boxes[i]!
      const hits = index.search(b.minX - maxClearance, b.minY - maxClearance, b.maxX + maxClearance, b.maxY + maxClearance)
      for (const j of hits) {
        if (j <= i) continue
        const o = copper[j]!
        if (a.net !== undefined && a.net === o.net) continue
        if (!a.layers.some((l) => o.layers.includes(l))) continue
        const ca = classOf(a.net)
        const co = classOf(o.net)
        // The larger of the two classes' clearances; a tie names a real class over `default`.
        const cls = co.clearance > ca.clearance || (co.clearance === ca.clearance && ca.name === 'default') ? co : ca
        const gap = shapeGap(a.shape, o.shape)
        if (gap.d >= cls.clearance - EPS) continue
        violations.push({
          // Touching (0 within float noise) or overlapping copper is a short.
          kind: gap.d <= EPS ? 'short' : 'clearance',
          class: cls.name,
          items: [a.id, o.id],
          required: cls.clearance,
          actual: gap.d <= EPS ? 0 : gap.d,
          at: mid(gap.a, gap.b),
        })
      }
    }
  }

  // All copper (traces, vias, pads, fixed copper) to the board edge, footprint cutouts included.
  const edge = input.rules.boardEdgeClearance
  const edgeBoxes = input.outline.map(edgeBounds)
  if (input.outline.length > 0) {
    const index = new Flatbush(input.outline.length)
    for (const b of edgeBoxes) index.add(b.minX, b.minY, b.maxX, b.maxY)
    index.finish()
    // One violation per copper item, against its nearest edge graphic (as KiCad reports it).
    for (const [i, c] of copper.entries()) {
      const b = boxes[i]!
      let worst: { k: number; gap: ReturnType<typeof edgeGap> } | undefined
      for (const k of index.search(b.minX - edge, b.minY - edge, b.maxX + edge, b.maxY + edge)) {
        const gap = edgeGap(c.shape, input.outline[k]!)
        if (gap.d < edge - EPS && (!worst || gap.d < worst.gap.d)) worst = { k, gap }
      }
      if (!worst) continue
      violations.push({
        kind: 'edge-clearance',
        class: classOf(c.net).name,
        items: [c.id, `edge:${worst.k}`],
        required: edge,
        actual: worst.gap.d,
        at: mid(worst.gap.a, worst.gap.b),
      })
    }
  }

  const byClass: Record<DrcClass, number> = { power: 0, signal: 0, default: 0 }
  // All copper (traces, vias, copper pads, fixed copper) to each NPTH hole's edge. A hole has no
  // net, so every item is checked; one violation per item and hole.
  const hole = input.rules.holeClearance
  if (holes.length > 0) {
    const index = new Flatbush(holes.length)
    for (const h of holes) {
      const b = shapeBounds(h.shape)
      index.add(b.minX, b.minY, b.maxX, b.maxY)
    }
    index.finish()
    for (const [i, c] of copper.entries()) {
      const b = boxes[i]!
      for (const k of index.search(b.minX - hole, b.minY - hole, b.maxX + hole, b.maxY + hole)) {
        const h = holes[k]!
        const gap = shapeGap(c.shape, h.shape)
        if (gap.d >= hole - EPS) continue
        violations.push({
          kind: 'hole-clearance',
          class: classOf(c.net).name,
          items: [c.id, h.id],
          required: hole,
          actual: gap.d <= EPS ? 0 : gap.d,
          at: mid(gap.a, gap.b),
        })
      }
    }
  }

  const byKind: Record<DrcKind, number> = {
    clearance: 0,
    short: 0,
    'track-width': 0,
    'edge-clearance': 0,
    'hole-clearance': 0,
  }
  for (const v of violations) {
    byClass[v.class]++
    byKind[v.kind]++
  }
  return { violations, byClass, byKind }
}
