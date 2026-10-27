// The one-key-move reroute (R3), engine-neutral and pure, for entries 7 and 10: which connections
// a moved key owns, the saved routes the engine must route around, and the diff of a reroute
// against them. Frame: KiCad's, mm, y down.
import { routedConnections } from './completion'
import { CORNEY_KEYS } from './corney'
import { drc, type DrcReport } from './drc'
import { addedViolations } from './drc-cases'
import { keyReferences } from './move-key'
import { EMPTY_ROUTES, viaOwners, type RerouteEntry, type RouteSet, type RouteTrace, type RouteVia } from './route-set'
import type { RoutingInput } from './routing-input'

/**
 * The ids of the scored (`key-cell`, `routing`) connections with a pad on one of `key`'s
 * footprints (S_n, D_n, D_{n+keys} and LED_n), in `input.connections` order.
 */
export function movedConnections(input: RoutingInput, key: string, keys: readonly string[] = CORNEY_KEYS): string[] {
  const index = keys.indexOf(key)
  if (index === -1) throw new Error(`Unknown key: ${key}`)
  const refs = new Set(keyReferences(index + 1, keys.length))
  const refOf = new Map(input.pads.map((p) => [p.id, p.reference]))
  return input.connections
    .filter((c) => c.realisedBy !== 'fixed-copper' && [c.padA, c.padB].some((p) => refs.has(refOf.get(p) ?? '')))
    .map((c) => c.id)
}

/**
 * The saved routes: every trace of `base` whose connection is not in `moved`, and every via
 * except those that only moved connections join (`viaOwners`). A via no trace ends on is kept.
 */
export function savedRoutes(base: RouteSet, moved: readonly string[]): RouteSet {
  const out = new Set(moved)
  const owners = viaOwners(base)
  return {
    traces: base.traces.filter((t) => !out.has(t.connection)),
    vias: base.vias.filter((_, i) => owners[i]!.length === 0 || owners[i]!.some((o) => !out.has(o))),
  }
}

/**
 * The saved routes that clash with the moved board `input` (story 10): the `drc` violations
 * `saved` adds over the board with no routes, and the saved connections in them (a trace item
 * by its connection id, a `via:<i>` item by `viaOwners(saved)[i]`; pad, `fixed:`, obstacle and
 * edge items are skipped), in `input.connections` order.
 */
export function savedConflicts(input: RoutingInput, saved: RouteSet): { violations: number; connections: string[] } {
  const added = addedViolations(drc(input, EMPTY_ROUTES), drc(input, saved))
  const traced = new Set(saved.traces.map((t) => t.connection))
  const owners = viaOwners(saved)
  const hit = new Set<string>()
  for (const v of added) {
    for (const item of v.items) {
      const via = /^via:(\d+)$/.exec(item)
      if (via) for (const o of owners[Number(via[1])] ?? []) hit.add(o)
      else if (traced.has(item)) hit.add(item)
    }
  }
  const order = new Map(input.connections.map((c, i) => [c.id, i]))
  const connections = [...hit].sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || (a < b ? -1 : 1))
  return { violations: added.length, connections }
}

const num = (n: number) => n.toFixed(6)
const traceKey = (t: RouteTrace) => `${t.layer}|${num(t.width)}|${t.net}|${t.points.map((p) => `${num(p.x)},${num(p.y)}`).join(' ')}`
const viaKey = (v: RouteVia) => `via|${num(v.at.x)},${num(v.at.y)}|${num(v.diameter)}|${num(v.drill)}|${v.net}`

/** Each connection's traces as a sorted list of keys, by connection id. */
function traceSignatures(routes: RouteSet): Map<string, string> {
  const keys = new Map<string, string[]>()
  for (const t of routes.traces) keys.set(t.connection, [...(keys.get(t.connection) ?? []), traceKey(t)])
  return new Map([...keys].map(([id, ks]) => [id, ks.sort().join('\n')]))
}

/** The vias of `xs` not in `ys` (a multiset difference by key), with their owners in `xs`. */
function viasOnlyIn(xs: RouteSet, ys: RouteSet): string[][] {
  const left = new Map<string, number>()
  for (const v of ys.vias) left.set(viaKey(v), (left.get(viaKey(v)) ?? 0) + 1)
  const owners = viaOwners(xs)
  return xs.vias.flatMap((v, i) => {
    const n = left.get(viaKey(v)) ?? 0
    if (n > 0) {
      left.set(viaKey(v), n - 1)
      return []
    }
    return [owners[i]!]
  })
}

/**
 * `report` with each `via:<i>` item named by the via's place and each violation's items sorted,
 * so two RouteSets compare whatever the order of their copper (`drc` lists items in that order).
 */
function byViaPlace(report: DrcReport, routes: RouteSet): DrcReport {
  const name = (item: string) => {
    const m = /^via:(\d+)$/.exec(item)
    const v = m ? routes.vias[Number(m[1])] : undefined
    return v ? `via@${num(v.at.x)},${num(v.at.y)}` : item
  }
  return { ...report, violations: report.violations.map((v) => ({ ...v, items: v.items.map(name).sort() })) }
}

export type RerouteDiff = Pick<
  RerouteEntry,
  'movedConnections' | 'changedConnections' | 'savedRoutes' | 'fixedCopperViolations' | 'drc'
>

/**
 * The reroute's diff on the moved board `input`: `after` (the whole rerouted set, saved routes
 * included) against `saved`. A connection changed when its traces differ, when a via it joins
 * was added or removed (and no other connection joining that via changed), or when the engine
 * says it replaced it (`replaced`, e.g. tscircuit's `__replaces_pcb_trace_id`).
 * `drc.added` and `fixedCopperViolations` are over `drc(input, saved)`, vias matched by place.
 */
export function rerouteDiff(
  input: RoutingInput,
  saved: RouteSet,
  after: RouteSet,
  moved: readonly string[],
  replaced: readonly string[] = [],
): RerouteDiff {
  const before = traceSignatures(saved)
  const now = traceSignatures(after)
  const changed = new Set(replaced)
  for (const id of new Set([...before.keys(), ...now.keys()])) {
    if (before.get(id) !== now.get(id)) changed.add(id)
  }
  // A via added or removed belongs to the connections that join it; when none of them changed
  // its traces already, the first one changed. A via that joins no trace changes no connection.
  for (const owners of [...viasOnlyIn(after, saved), ...viasOnlyIn(saved, after)]) {
    if (owners.length > 0 && !owners.some((o) => changed.has(o))) changed.add(owners[0]!)
  }
  const order = new Map(input.connections.map((c, i) => [c.id, i]))
  const changedConnections = [...changed].sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || (a < b ? -1 : 1))

  const movedSet = new Set(moved)
  const savedIds = [
    ...new Set([...before.keys(), ...viaOwners(saved).flat()]),
  ].filter((id) => !movedSet.has(id))
  const savedChanged = savedIds.filter((id) => changed.has(id)).length

  const added = addedViolations(byViaPlace(drc(input, saved), saved), byViaPlace(drc(input, after), after))
  const routed = new Set(routedConnections(input, after))
  return {
    movedConnections: { total: moved.length, routed: moved.filter((id) => routed.has(id)).length },
    changedConnections,
    savedRoutes: { unchanged: savedIds.length - savedChanged, changed: savedChanged },
    fixedCopperViolations: added.filter((v) => v.items.some((i) => /^fixed:\d+$/.test(i))).length,
    drc: { added: added.length },
  }
}
