// Which connections a RouteSet realises, and the scorecard's connection counts. Engine-neutral and
// pure (entries 6 and 9). Frame: KiCad's, mm, y down.
import type { Point } from '../../fixtures/src/kicad-pcb'
import type { ConnectionCount, RouteSet, RouteTrace, Scorecard } from './route-set'
import type { Connection, Realisation, RoutingInput, RoutingPad } from './routing-input'
import { coreDistance, padShape, pointSegment } from './shapes'

/** Float noise only: ends and vias must coincide, not merely come close. */
const EPS = 1e-6

function onPolyline(p: Point, t: RouteTrace): boolean {
  for (let k = 1; k < t.points.length; k++) if (pointSegment(p, t.points[k - 1]!, t.points[k]!).d <= EPS) return true
  return false
}

const ends = (t: RouteTrace): Point[] => [t.points[0]!, t.points.at(-1)!]
const same = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= EPS

function onPad(p: Point, layer: RouteTrace['layer'], pad: RoutingPad): boolean {
  if (!pad.layers.includes(layer)) return false
  const s = padShape(pad)
  return coreDistance({ kind: 'point', p }, s.core).d <= s.r + EPS
}

/**
 * Whether `traces` realise `c`: they are continuous (each joins the rest at an end on the same
 * layer, or at a via of the net on another layer; a layer change anywhere else is a gap), and an
 * end lies on padA's copper and an end on padB's, each on a layer the pad has.
 */
export function realises(c: Connection, pads: { a: RoutingPad; b: RoutingPad }, traces: RouteTrace[], vias: RouteSet['vias']): boolean {
  const ts = traces.filter((t) => t.points.length >= 2)
  if (ts.length === 0) return false
  const netVias = vias.filter((v) => v.net === c.net)
  const parent = ts.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]!]!
    return i
  }
  const joined = (s: RouteTrace, t: RouteTrace) =>
    ends(s).some((e) =>
      s.layer === t.layer ? onPolyline(e, t) : netVias.some((v) => same(v.at, e) && onPolyline(v.at, t)),
    )
  for (let i = 0; i < ts.length; i++) {
    for (let j = i + 1; j < ts.length; j++) {
      if (joined(ts[i]!, ts[j]!) || joined(ts[j]!, ts[i]!)) parent[find(i)] = find(j)
    }
  }
  const root = find(0)
  if (ts.some((_, i) => find(i) !== root)) return false
  const reaches = (pad: RoutingPad) => ts.some((t) => ends(t).some((e) => onPad(e, t.layer, pad)))
  return reaches(pads.a) && reaches(pads.b)
}

/** The ids of the connections `routes` realises (see `realises`), in `input.connections` order. */
export function routedConnections(input: RoutingInput, routes: RouteSet): string[] {
  const padById = new Map(input.pads.map((p) => [p.id, p]))
  const byConnection = new Map<string, RouteTrace[]>()
  for (const t of routes.traces) byConnection.set(t.connection, [...(byConnection.get(t.connection) ?? []), t])
  return input.connections
    .filter((c) => {
      const a = padById.get(c.padA)
      const b = padById.get(c.padB)
      if (!a || !b) throw new Error(`Connection ${c.id}: unknown pad`)
      return realises(c, { a, b }, byConnection.get(c.id) ?? [], routes.vias)
    })
    .map((c) => c.id)
}

const pct = (routed: number, total: number) => (total === 0 ? 0 : (routed / total) * 100)

/**
 * The scorecard's `connections`, from the routed ids. Totals and completion are over `key-cell`
 * and `routing`; `fixed-copper` connections are never sent to an engine, so their `routed` counts
 * only what the routes realise and their completion is null.
 */
export function completionCounts(input: RoutingInput, routed: readonly string[]): Scorecard['connections'] {
  const done = new Set(routed)
  const count = (r: Realisation): ConnectionCount => {
    const cs = input.connections.filter((c) => c.realisedBy === r)
    const n = cs.filter((c) => done.has(c.id)).length
    return { total: cs.length, routed: n, completionPct: r === 'fixed-copper' ? null : pct(n, cs.length) }
  }
  const byRealisation = { 'key-cell': count('key-cell'), 'fixed-copper': count('fixed-copper'), routing: count('routing') }
  const total = byRealisation['key-cell'].total + byRealisation.routing.total
  const n = byRealisation['key-cell'].routed + byRealisation.routing.routed
  return { total, routed: n, completionPct: pct(n, total), byRealisation }
}

/** The ids of the scored connections (`key-cell` and `routing`) that `routed` leaves out. */
export function unroutedConnections(input: RoutingInput, routed: readonly string[]): string[] {
  const done = new Set(routed)
  return input.connections.filter((c) => c.realisedBy !== 'fixed-copper' && !done.has(c.id)).map((c) => c.id)
}
