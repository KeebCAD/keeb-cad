// The I/O matrix's test boards: RouteSets over Corney, placed in free board area found from the
// pad, hole, fixed-copper and outline bounds (never hand-picked coordinates). Pure.
import type { Point } from '../../fixtures/src/kicad-pcb'
import type { DrcReport, DrcViolation } from './drc'
import type { DrcKind, RouteSet, RouteTrace } from './route-set'
import type { NetClassName, RoutingInput } from './routing-input'
import { edgeGap, edgePolyline, padShape, shapeBounds, traceShape, type Box } from './shapes'

/** Clean and violation gap, copper edge to copper edge (see the plan's design notes). */
export const PAIR_GAP = 0.17
/** Trace to Edge.Cuts gap for the edge case. */
export const EDGE_GAP = 0.2
/** The width case's trace, below signal's 0.15 mm. */
export const THIN_WIDTH = 0.1
/** Trace to NPTH hole edge gap for the hole case, below the 0.25 mm hole clearance. */
export const HOLE_GAP = 0.2
const LENGTH = 4
/** Free area: nothing (copper, hole, edge) within this of the case's copper. */
const MARGIN = 2

export interface DrcCase {
  name: string
  design: 'wired' | 'wireless'
  routes: RouteSet
  /** What `drc` must add over the bare board of `design`: total and per kind. */
  expect: { total: number; byKind: Partial<Record<DrcKind, number>> }
  /**
   * A known KiCad blind spot: KiCad 10.0.7 reports nothing for these added `drc` violations
   * (decision 2026-10-27), so their absence in KiCad is recorded, not counted as a disagreement.
   */
  kicadBlindSpot?: string
}

const key = (v: DrcViolation) => `${v.kind}|${v.class}|${v.items.join('|')}`

/** The violations of `report` that are not in `baseline` (a multiset difference). */
export function addedViolations(baseline: DrcReport, report: DrcReport): DrcViolation[] {
  const left = new Map<string, number>()
  for (const v of baseline.violations) left.set(key(v), (left.get(key(v)) ?? 0) + 1)
  return report.violations.filter((v) => {
    const n = left.get(key(v)) ?? 0
    if (n > 0) left.set(key(v), n - 1)
    return n === 0
  })
}

/** Even-odd inside test against the Edge.Cuts graphics, arcs as fine polylines. */
export function insideOutline(p: Point, input: RoutingInput): boolean {
  let inside = false
  for (const e of input.outline) {
    const pts = edgePolyline(e)
    const closed = e.kind === 'circle' ? [...pts, pts[0]!] : pts
    for (let i = 1; i < closed.length; i++) {
      const a = closed[i - 1]!
      const b = closed[i]!
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
    }
  }
  return inside
}

function obstacleBoxes(input: RoutingInput): Box[] {
  const hole = (x: number, y: number, d: number): Box => ({ minX: x - d / 2, minY: y - d / 2, maxX: x + d / 2, maxY: y + d / 2 })
  return [
    ...input.pads.map((p) => shapeBounds(padShape(p))),
    ...input.obstacles.map((o) =>
      o.type === 'np_thru_hole' ? hole(o.x, o.y, Math.max(o.size.w, o.size.h, o.drill?.w ?? 0)) : shapeBounds(padShape(o)),
    ),
    ...input.fixedCopper.map((t) => shapeBounds(traceShape(t.start, t.end, t.width))),
  ]
}

const overlaps = (a: Box, b: Box) => a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY

function boardBox(input: RoutingInput): Box {
  const pts = input.outline.flatMap(edgePolyline)
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
  }
}

/** Whether a box (grown by MARGIN) is clear of copper, holes and edges, and inside the board. */
function isFree(box: Box, input: RoutingInput, blocked: Box[]): boolean {
  const grown = { minX: box.minX - MARGIN, minY: box.minY - MARGIN, maxX: box.maxX + MARGIN, maxY: box.maxY + MARGIN }
  if (blocked.some((b) => overlaps(b, grown))) return false
  const corners = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.maxX, y: box.maxY },
    { x: box.minX, y: box.maxY },
  ]
  if (!corners.every((c) => insideOutline(c, input))) return false
  // Inside with every side more than MARGIN from every edge graphic: the whole box is clear.
  const sides = corners.map((a, i) => traceShape(a, corners[(i + 1) % 4]!, 0))
  return sides.every((s) => input.outline.every((e) => edgeGap(s, e).d > MARGIN))
}

/** The first free square of side `size` in a scan of the board box (0.5 mm grid, row by row). */
export function freeArea(input: RoutingInput, size: number): Point {
  const blocked = obstacleBoxes(input)
  const board = boardBox(input)
  for (let y = board.minY + MARGIN; y + size <= board.maxY - MARGIN; y += 0.5) {
    for (let x = board.minX + MARGIN; x + size <= board.maxX - MARGIN; x += 0.5) {
      if (isFree({ minX: x, minY: y, maxX: x + size, maxY: y + size }, input, blocked)) {
        return { x: x + size / 2, y: y + size / 2 }
      }
    }
  }
  throw new Error(`No free ${size} mm area on the board`)
}

function netsOf(input: RoutingInput, name: NetClassName): string[] {
  const c = input.netClasses.find((k) => k.name === name)
  if (!c) throw new Error(`No ${name} class`)
  return [...c.nets].sort()
}

function widthOf(input: RoutingInput, net: string): number {
  const c = input.netClasses.find((k) => k.nets.includes(net))
  if (!c) throw new Error(`Net ${net} is in no class`)
  return c.traceWidth
}

const trace = (connection: string, net: string, width: number, points: Point[]): RouteTrace => ({
  connection,
  net,
  layer: 'F.Cu',
  width,
  points,
})

/** A horizontal trace of LENGTH centred on (cx, y). */
const across = (connection: string, net: string, width: number, cx: number, y: number) =>
  trace(connection, net, width, [
    { x: cx - LENGTH / 2, y },
    { x: cx + LENGTH / 2, y },
  ])

/** Two parallel traces `PAIR_GAP` apart, copper to copper, at the free centre `c`. */
function pair(input: RoutingInput, c: Point, netA: string, netB: string): RouteSet {
  const wa = widthOf(input, netA)
  const wb = widthOf(input, netB)
  return {
    traces: [
      across(`case:${netA}:a`, netA, wa, c.x, c.y),
      across(`case:${netB}:b`, netB, wb, c.x, c.y + wa / 2 + PAIR_GAP + wb / 2),
    ],
    vias: [],
  }
}

/** A trace parallel to the longest outline line whose surroundings are free, EDGE_GAP inside it. */
function edgeCase(input: RoutingInput, net: string): RouteSet {
  const width = widthOf(input, net)
  const blocked = obstacleBoxes(input)
  const lines = input.outline
    .map((e, k) => ({ e, k }))
    .filter((x): x is { e: Extract<RoutingInput['outline'][number], { kind: 'line' }>; k: number } => x.e.kind === 'line')
    .sort((a, b) => Math.hypot(b.e.end.x - b.e.start.x, b.e.end.y - b.e.start.y) - Math.hypot(a.e.end.x - a.e.start.x, a.e.end.y - a.e.start.y))
  for (const { e, k } of lines) {
    const len = Math.hypot(e.end.x - e.start.x, e.end.y - e.start.y)
    if (len < LENGTH + 2 * MARGIN) continue
    const u = { x: (e.end.x - e.start.x) / len, y: (e.end.y - e.start.y) / len }
    const m = { x: (e.start.x + e.end.x) / 2, y: (e.start.y + e.end.y) / 2 }
    for (const sign of [1, -1]) {
      const n = { x: -u.y * sign, y: u.x * sign }
      if (!insideOutline({ x: m.x + n.x, y: m.y + n.y }, input)) continue
      const off = EDGE_GAP + width / 2
      const c = { x: m.x + n.x * off, y: m.y + n.y * off }
      const a = { x: c.x - (u.x * LENGTH) / 2, y: c.y - (u.y * LENGTH) / 2 }
      const b = { x: c.x + (u.x * LENGTH) / 2, y: c.y + (u.y * LENGTH) / 2 }
      const box = shapeBounds(traceShape(a, b, width))
      const grown = { minX: box.minX - MARGIN, minY: box.minY - MARGIN, maxX: box.maxX + MARGIN, maxY: box.maxY + MARGIN }
      if (blocked.some((o) => overlaps(o, grown))) continue
      const t = traceShape(a, b, width)
      if (input.outline.some((o, j) => j !== k && edgeGap(t, o).d <= MARGIN)) continue
      return { traces: [trace(`case:${net}:edge`, net, width, [a, b])], vias: [] }
    }
  }
  throw new Error('No free outline line for the edge case')
}

/**
 * A short trace HOLE_GAP from the edge of a Corney mounting hole (an NPTH `MH<n>`), tangent above
 * it, in the first such spot with nothing else (copper, other holes, edges) within 1 mm.
 */
function holeCase(input: RoutingInput, net: string): RouteSet {
  const width = widthOf(input, net)
  const all = obstacleBoxes(input)
  const ownBox = input.pads.length
  const near = 1
  for (const [i, o] of input.obstacles.entries()) {
    if (o.type !== 'np_thru_hole' || !/^MH\d+$/.test(o.reference)) continue
    const r = (o.drill?.w ?? o.size.w) / 2
    const y = o.y - r - HOLE_GAP - width / 2
    const a = { x: o.x - 1, y }
    const b = { x: o.x + 1, y }
    const t = traceShape(a, b, width)
    const box = shapeBounds(t)
    const grown = { minX: box.minX - near, minY: box.minY - near, maxX: box.maxX + near, maxY: box.maxY + near }
    // Skip the hole's own box (obstacle i sits at ownBox + i in obstacleBoxes).
    if (all.some((x, j) => j !== ownBox + i && overlaps(x, grown))) continue
    if (!insideOutline(a, input) || !insideOutline(b, input)) continue
    if (input.outline.some((e) => edgeGap(t, e).d <= near)) continue
    return { traces: [trace(`case:${net}:hole`, net, width, [a, b])], vias: [] }
  }
  throw new Error('No free mounting hole for the hole case')
}

/** The matrix rows that run on boards (Unknown net and No kicad-cli are unit/script checks). */
export function drcCases(inputs: Record<'wired' | 'wireless', RoutingInput>): DrcCase[] {
  const wired = inputs.wired
  const [s1, s2] = netsOf(wired, 'signal')
  if (!s1 || !s2) throw new Error('Need two signal nets')
  const gnd = 'GND'
  const c = freeArea(wired, LENGTH)
  const sw = widthOf(wired, s1)
  const none = { total: 0, byKind: {} }
  return [
    { name: 'bare-wired', design: 'wired', routes: { traces: [], vias: [] }, expect: none },
    { name: 'bare-wireless', design: 'wireless', routes: { traces: [], vias: [] }, expect: none },
    { name: 'clean', design: 'wired', routes: pair(wired, c, s1, s2), expect: none },
    { name: 'violation', design: 'wired', routes: pair(wired, c, s1, gnd), expect: { total: 1, byKind: { clearance: 1 } } },
    { name: 'edge', design: 'wired', routes: edgeCase(wired, s1), expect: { total: 1, byKind: { 'edge-clearance': 1 } } },
    { name: 'hole', design: 'wired', routes: holeCase(wired, s1), expect: { total: 1, byKind: { 'hole-clearance': 1 } } },
    {
      name: 'short-touch',
      design: 'wired',
      // Copper edges exactly touch: centre lines one width apart.
      routes: {
        traces: [across(`case:${s1}:a`, s1, sw, c.x, c.y), across(`case:${s2}:b`, s2, sw, c.x, c.y + sw)],
        vias: [],
      },
      expect: { total: 1, byKind: { short: 1 } },
    },
    {
      name: 'short-crossing',
      design: 'wired',
      routes: {
        traces: [
          across(`case:${s1}:h`, s1, sw, c.x, c.y),
          trace(`case:${s2}:v`, s2, sw, [
            { x: c.x, y: c.y - LENGTH / 2 },
            { x: c.x, y: c.y + LENGTH / 2 },
          ]),
        ],
        vias: [],
      },
      expect: { total: 1, byKind: { short: 1 } },
      kicadBlindSpot: 'KiCad 10.0.7 reports nothing for crossing or overlapping traces of two nets',
    },
    {
      name: 'width',
      design: 'wired',
      routes: { traces: [across(`case:${s1}:thin`, s1, THIN_WIDTH, c.x, c.y)], vias: [] },
      expect: { total: 1, byKind: { 'track-width': 1 } },
    },
    {
      name: 'same-net',
      design: 'wired',
      routes: {
        traces: [
          across(`case:${gnd}:a`, gnd, widthOf(wired, gnd), c.x, c.y),
          across(`case:${gnd}:b`, gnd, widthOf(wired, gnd), c.x + 1, c.y + 0.1),
        ],
        vias: [],
      },
      expect: none,
    },
  ]
}
