// Engine-neutral routing input from an Ergogen `.kicad_pcb` (Corney). Pure: text in, data out.
// Frame and units are KiCad's: mm, y down, degrees. Entries 6–10 adapt this to their engines.
import {
  parseSexpr,
  readFootprintEdgeCuts,
  readKicadPcb,
  readPads,
  readSegments,
  type Pad,
  type Point,
  type Segment,
  type Sexpr,
  type Size,
} from '../../fixtures/src/kicad-pcb'
import { splitNet } from './split-rule'

export type CopperLayer = 'F.Cu' | 'B.Cu'
/** Which copper a pad is on: front, back, or through-hole (both). */
export type PadCopper = 'F' | 'B' | 'TH'

interface PadGeometry {
  /** KiCad pad type, e.g. `smd`, `thru_hole`, `np_thru_hole`. */
  type: string
  /** KiCad pad shape, e.g. `circle`, `rect`, `roundrect`, `oval`. */
  shape: string
  /** World position and rotation (degrees, [0, 360)). */
  x: number
  y: number
  r: number
  /** Unrotated pad size; rotate by `r`. */
  size: Size
  drill: Size | undefined
  layers: CopperLayer[]
  /** KiCad `roundrect_rratio` (roundrect pads only). */
  roundrectRatio?: number
  /** KiCad `chamfer_ratio` and chamfered corners (`top_left`, `bottom_right`…), when chamfered. */
  chamfer?: { ratio: number; corners: string[] }
}

/** Shape details `readPads` does not read: roundrect ratio and chamfers, per pad in file order. */
export interface PadShapeExtra {
  roundrectRatio?: number
  chamfer?: { ratio: number; corners: string[] }
}

export interface RoutingPad extends PadGeometry {
  /**
   * `<Reference>.<pin>.<copper>`, e.g. `S1.2.F`. A repeat of the same triple (TRRS1's reversible
   * holes) gets `.2`, `.3`… in file order: `TRRS1.2.TH`, `TRRS1.2.TH.2`.
   */
  id: string
  reference: string
  pin: string
  copper: PadCopper
  net: string
}

/** A pad that belongs to no net (NPTH holes, unnumbered tabs, unused pins): an obstacle only. */
export interface PadObstacle extends PadGeometry {
  reference: string
  /** `''` when unnumbered. */
  pin: string
}

/** Pre-routed copper (Ergogen's jumper traces): kept as is, never rerouted. */
export interface FixedTrace {
  start: Point
  end: Point
  width: number
  layer: CopperLayer
  net: string | undefined
}

/**
 * An area no new copper may enter. Corney's sources define none (no antenna keep-out), and the
 * module zone is its fixed copper, not an area (decision 2026-10-27), so this stays empty.
 */
export interface KeepOut {
  id: string
  /** World polygon, corners in order. */
  polygon: Point[]
  layers: CopperLayer[]
}

export type NetClassName = 'power' | 'signal'

export interface NetClass {
  name: NetClassName
  traceWidth: number
  clearance: number
  nets: string[]
}

export type Realisation = 'key-cell' | 'fixed-copper' | 'routing'

export interface Connection {
  /** `<net>:<padA>~<padB>`; see SPLIT-RULE.md. */
  id: string
  net: string
  padA: string
  padB: string
  /**
   * `fixed-copper`: the pre-routed traces already join both pads. `key-cell`: both pads are on one
   * key's switch or diodes (AD-12). Otherwise `routing`. Positions decide only this tag.
   */
  realisedBy: Realisation
}

export interface DesignRules {
  layers: CopperLayer[]
  /** The strictest net class's clearance, for engines that take one value. */
  engineClearance: number
  boardEdgeClearance: number
  /** Copper to an NPTH hole's edge (KiCad's default hole clearance; decision 2026-10-27). */
  holeClearance: number
  via: { diameter: number; drill: number }
}

export interface RoutingInput {
  /**
   * Edge.Cuts graphics: the top-level ones as in the file, then each footprint's (LED windows),
   * in world coordinates and file order, rects and polygons as their sides (decision 2026-10-27).
   */
  outline: Segment[]
  pads: RoutingPad[]
  obstacles: PadObstacle[]
  fixedCopper: FixedTrace[]
  keepOuts: KeepOut[]
  netClasses: NetClass[]
  rules: DesignRules
  connections: Connection[]
}

const LAYERS: CopperLayer[] = ['F.Cu', 'B.Cu']

/** JLCPCB 2-layer rules with margin (decision 2026-10-27; jlcpcb.com/capabilities). */
export const POWER_NETS: readonly string[] = ['GND', 'VCC', 'RAW', 'BAT_P']
const CLASS_RULES: Record<NetClassName, { traceWidth: number; clearance: number }> = {
  power: { traceWidth: 0.25, clearance: 0.2 },
  signal: { traceWidth: 0.15, clearance: 0.15 },
}
const BOARD_EDGE_CLEARANCE = 0.3
const HOLE_CLEARANCE = 0.25
const VIA = { diameter: 0.56, drill: 0.3 }

function copperOf(pad: Pad): { copper: PadCopper; layers: CopperLayer[] } {
  const where = `pad ${pad.reference}.${pad.pin || '(unnumbered)'}`
  if (pad.layers.includes('*.Cu')) return { copper: 'TH', layers: [...LAYERS] }
  const f = pad.layers.includes('F.Cu')
  const b = pad.layers.includes('B.Cu')
  if (f && b) return { copper: 'TH', layers: [...LAYERS] }
  if (f) return { copper: 'F', layers: ['F.Cu'] }
  if (b) return { copper: 'B', layers: ['B.Cu'] }
  throw new Error(`${where}: no copper layer in ${pad.layers.join(' ')}`)
}

function geometry(pad: Pad, extra: PadShapeExtra = {}): PadGeometry {
  return {
    ...extra,
    type: pad.type,
    shape: pad.shape,
    x: pad.x,
    y: pad.y,
    r: pad.r,
    size: pad.size,
    drill: pad.drill,
    layers: copperOf(pad).layers,
  }
}

export function padId(reference: string, pin: string, copper: PadCopper): string {
  return `${reference}.${pin}.${copper}`
}

/**
 * Splits pads into routable pads (numbered, on a net) and obstacles. A repeated
 * `<Reference>.<pin>.<copper>` keeps the id on its first pad in file order; later ones get `.2`,
 * `.3`… Copies are never merged.
 */
export function classifyPads(
  pads: readonly Pad[],
  extras: readonly PadShapeExtra[] = [],
): {
  pads: RoutingPad[]
  obstacles: PadObstacle[]
} {
  const routable: RoutingPad[] = []
  const obstacles: PadObstacle[] = []
  const seen = new Map<string, number>()
  for (const [i, pad] of pads.entries()) {
    const extra = extras[i]
    if (pad.pin === '' || pad.net === undefined) {
      obstacles.push({ reference: pad.reference, pin: pad.pin, ...geometry(pad, extra) })
      continue
    }
    const { copper } = copperOf(pad)
    const base = padId(pad.reference, pad.pin, copper)
    const copy = (seen.get(base) ?? 0) + 1
    seen.set(base, copy)
    const id = copy === 1 ? base : `${base}.${copy}`
    routable.push({ id, reference: pad.reference, pin: pad.pin, copper, net: pad.net, ...geometry(pad, extra) })
  }
  return { pads: routable, obstacles }
}

/**
 * Which key (1-based) a reference belongs to, for the key-cell test: S_n and the diodes D_n and
 * D_{n+keys}. LEDs and everything else belong to no key.
 */
function keyCellOf(reference: string, keyCount: number): number | undefined {
  const m = /^([SD])(\d+)$/.exec(reference)
  if (!m) return undefined
  const n = Number(m[2])
  if (m[1] === 'S') return n >= 1 && n <= keyCount ? n : undefined
  if (n >= 1 && n <= keyCount) return n
  if (n > keyCount && n <= 2 * keyCount) return n - keyCount
  return undefined
}

export function netClassOf(net: string): NetClassName {
  return POWER_NETS.includes(net) ? 'power' : 'signal'
}

const EPS = 1e-6

/** Whether `p` lies on the pad's copper (rect-like shapes by their box, circles by radius). */
function onPad(p: Point, pad: RoutingPad): boolean {
  const t = (pad.r * Math.PI) / 180
  const dx = p.x - pad.x
  const dy = p.y - pad.y
  const u = dx * Math.cos(t) - dy * Math.sin(t)
  const v = dx * Math.sin(t) + dy * Math.cos(t)
  if (pad.shape === 'circle') return Math.hypot(u, v) <= pad.size.w / 2 + EPS
  return Math.abs(u) <= pad.size.w / 2 + EPS && Math.abs(v) <= pad.size.h / 2 + EPS
}

function onTrace(p: Point, t: FixedTrace): boolean {
  const ex = t.end.x - t.start.x
  const ey = t.end.y - t.start.y
  const len2 = ex * ex + ey * ey
  const k = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - t.start.x) * ex + (p.y - t.start.y) * ey) / len2))
  return Math.hypot(t.start.x + k * ex - p.x, t.start.y + k * ey - p.y) <= EPS
}

/**
 * Groups pads that the fixed copper joins: a trace end on a pad's copper (same layer; TH pads are
 * on both) joins them, and a trace end on another trace of the same layer joins the traces.
 * Returns a component label per pad id; pads no trace touches get none.
 */
export function fixedCopperGroups(pads: readonly RoutingPad[], traces: readonly FixedTrace[]): Map<string, number> {
  const parent = traces.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]!]!
    return i
  }
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }
  for (const [i, a] of traces.entries()) {
    for (const [j, b] of traces.entries()) {
      if (i !== j && a.layer === b.layer && (onTrace(a.start, b) || onTrace(a.end, b))) union(i, j)
    }
  }
  // A pad on several traces' ends joins those traces (this is how a TH pad changes layer).
  const padTrace = new Map<string, number>()
  for (const pad of pads) {
    for (const [i, t] of traces.entries()) {
      if (!pad.layers.includes(t.layer) || !(onPad(t.start, pad) || onPad(t.end, pad))) continue
      const seen = padTrace.get(pad.id)
      if (seen === undefined) padTrace.set(pad.id, i)
      else union(seen, i)
    }
  }
  return new Map([...padTrace].map(([id, i]) => [id, find(i)]))
}

function copperLayer(layer: string): CopperLayer {
  if (layer === 'F.Cu' || layer === 'B.Cu') return layer
  throw new Error(`Segment on non-copper layer ${layer}`)
}

/** Each pad's roundrect ratio and chamfer, in `readPads`'s order (footprints, then pads). */
export function readPadShapeExtras(pcbText: string): PadShapeExtra[] {
  const root = parseSexpr(pcbText)
  if (!Array.isArray(root)) return []
  const lists = (node: Sexpr[], name: string) =>
    node.filter((c): c is Sexpr[] => Array.isArray(c) && c[0] === name)
  return lists(root, 'footprint').flatMap((fp) =>
    lists(fp, 'pad').map((pad) => {
      const extra: PadShapeExtra = {}
      const rr = lists(pad, 'roundrect_rratio')[0]?.[1]
      if (typeof rr === 'string') extra.roundrectRatio = Number(rr)
      const ratio = lists(pad, 'chamfer_ratio')[0]?.[1]
      const corners = (lists(pad, 'chamfer')[0] ?? []).slice(1).filter((c): c is string => typeof c === 'string')
      if (typeof ratio === 'string' && Number(ratio) > 0 && corners.length > 0) {
        extra.chamfer = { ratio: Number(ratio), corners }
      }
      return extra
    }),
  )
}

/** Builds the engine-neutral routing input from a `.kicad_pcb`'s text. */
export function toRoutingInput(pcbText: string): RoutingInput {
  const { edgeCuts, footprints } = readKicadPcb(pcbText)
  const { pads, obstacles } = classifyPads(readPads(pcbText), readPadShapeExtras(pcbText))

  const fixedCopper: FixedTrace[] = readSegments(pcbText).map((s) => ({
    start: s.start,
    end: s.end,
    width: s.width,
    layer: copperLayer(s.layer),
    net: s.net,
  }))

  const keepOuts: KeepOut[] = []
  const groups = fixedCopperGroups(pads, fixedCopper)

  const byNet = new Map<string, RoutingPad[]>()
  for (const pad of pads) byNet.set(pad.net, [...(byNet.get(pad.net) ?? []), pad])
  const nets = [...byNet.keys()]

  const netClasses: NetClass[] = (['power', 'signal'] as const).map((name) => ({
    name,
    ...CLASS_RULES[name],
    nets: nets.filter((n) => netClassOf(n) === name),
  }))

  const keyCount = footprints.filter((f) => /^S\d+$/.test(f.reference)).length
  const padById = new Map(pads.map((p) => [p.id, p]))
  const connections: Connection[] = [...byNet].flatMap(([net, netPads]) =>
    splitNet(
      net,
      netPads.map((p) => p.id),
    ).map((c) => {
      const ga = groups.get(c.padA)
      const a = keyCellOf(padById.get(c.padA)!.reference, keyCount)
      const b = keyCellOf(padById.get(c.padB)!.reference, keyCount)
      const realisedBy: Realisation =
        ga !== undefined && ga === groups.get(c.padB)
          ? 'fixed-copper'
          : a !== undefined && a === b
            ? 'key-cell'
            : 'routing'
      return { ...c, realisedBy }
    }),
  )

  return {
    outline: [...edgeCuts, ...readFootprintEdgeCuts(pcbText).map((c) => c.segment)],
    pads,
    obstacles,
    fixedCopper,
    keepOuts,
    netClasses,
    rules: {
      layers: [...LAYERS],
      engineClearance: Math.max(...netClasses.map((c) => c.clearance)),
      boardEdgeClearance: BOARD_EDGE_CLEARANCE,
      holeClearance: HOLE_CLEARANCE,
      via: { ...VIA },
    },
    connections,
  }
}
