// The I/O matrix's unit rows for the one-key-move reroute (story 7), on wireless Corney with
// synthetic routes (straight pad-to-pad traces, some through a via): no engine runs here.
import { describe, expect, it } from 'vitest'
import { CORNEY, CORNEY_KEYS } from './corney'
import { keyReferences, moveKey } from './move-key'
import { drc } from './drc'
import { movedConnections, rerouteDiff, savedRoutes } from './reroute'
import { DELTA, KEY, straightRoutes } from './reroute-cases'
import { fixedCopperNets, type RouteSet, type RouteTrace } from './route-set'
import { toRoutingInput } from './routing-input'
import { mergeReroute, toRouteSet, toSimplifiedPcbTraces } from './tscircuit-adapter'

const input = toRoutingInput(moveKey(CORNEY.wireless, KEY, DELTA))
const moved = movedConnections(input, KEY)
const scored = input.connections.filter((c) => c.realisedBy !== 'fixed-copper').map((c) => c.id)
// The base run's routes: every scored connection, the moved key's at their old place as well.
const base = straightRoutes(toRoutingInput(CORNEY.wireless), scored)
const saved = savedRoutes(base, moved)
const savedIds = new Set(saved.traces.map((t) => t.connection))
const union = (a: RouteSet, b: RouteSet): RouteSet => ({ traces: [...a.traces, ...b.traces], vias: [...a.vias, ...b.vias] })

describe('movedConnections and savedRoutes', () => {
  it('takes the scored connections with a pad on a moved footprint', () => {
    const refs = new Set(keyReferences(CORNEY_KEYS.indexOf(KEY) + 1, CORNEY_KEYS.length))
    const refOf = new Map(input.pads.map((p) => [p.id, p.reference]))
    const want = input.connections
      .filter((c) => c.realisedBy !== 'fixed-copper' && (refs.has(refOf.get(c.padA)!) || refs.has(refOf.get(c.padB)!)))
      .map((c) => c.id)
    expect(moved).toEqual(want)
    expect(moved.length).toBeGreaterThan(0)
    expect(() => movedConnections(input, 'matrix_nope')).toThrow('Unknown key: matrix_nope')
  })

  it('keeps every other connection’s traces and vias, and drops the moved ones', () => {
    expect([...savedIds].sort()).toEqual(scored.filter((id) => !moved.includes(id)).sort())
    const movedVias = straightRoutes(input, scored).vias.length - saved.vias.length
    expect(saved.vias.length).toBeLessThan(base.vias.length)
    expect(movedVias).toBeGreaterThan(0)
    for (const v of saved.vias) expect(base.vias).toContain(v)
  })
})

describe('rerouteDiff', () => {
  it('untouched: only the moved key’s connections change', () => {
    const after = union(saved, straightRoutes(input, moved))
    const diff = rerouteDiff(input, saved, after, moved)
    expect(diff.changedConnections).toEqual(moved)
    expect(diff.savedRoutes).toEqual({ unchanged: savedIds.size, changed: 0 })
    expect(diff.movedConnections.total).toBe(moved.length)
    expect(diff.fixedCopperViolations).toBe(0)
  })

  it('a new via where a moved and a saved trace of the net meet changes only the moved one', () => {
    const fresh = straightRoutes(input, moved)
    // A moved connection whose first pad a saved trace of its net also ends on (a chain pad).
    const t = fresh.traces.find((x) => saved.traces.some((s) => s.net === x.net && s.points.some((p) => p.x === x.points[0]!.x && p.y === x.points[0]!.y)))!
    const via = { at: t.points[0]!, diameter: input.rules.via.diameter, drill: input.rules.via.drill, net: t.net }
    const diff = rerouteDiff(input, saved, union(saved, { traces: fresh.traces, vias: [...fresh.vias, via] }), moved)
    expect(diff.changedConnections).toEqual(moved)
    expect(diff.savedRoutes.changed).toBe(0)
  })

  it('saved route changed: a preloaded trace returned with __replaces_pcb_trace_id', () => {
    const preloaded = toSimplifiedPcbTraces(input, saved)
    const target = preloaded[0]!
    const shifted = {
      ...target,
      pcb_trace_id: `${target.pcb_trace_id}_preloaded`,
      __replaces_pcb_trace_id: target.pcb_trace_id,
    }
    // Detour: a wire point inserted half a millimetre off the first wire's midpoint.
    const [p, q] = shifted.route as Array<{ route_type: 'wire'; x: number; y: number; width: number; layer: string }>
    shifted.route = [p!, { ...p!, x: (p!.x + q!.x) / 2 + 0.5, y: (p!.y + q!.y) / 2 }, ...shifted.route.slice(1)]
    const returned = [shifted, ...toSimplifiedPcbTraces(input, straightRoutes(input, moved))]
    const { routes: after, replaced } = mergeReroute(input, saved, toRouteSet(input, returned), returned)
    const id = input.connections[Number(target.connection_name.slice(1))]!.id
    expect(replaced).toEqual([id])
    // The replaced trace's copper is gone, not doubled.
    expect(after.traces.filter((t) => t.connection === id)).toHaveLength(1)
    const diff = rerouteDiff(input, saved, after, moved, replaced)
    expect(diff.changedConnections).toContain(id)
    expect(diff.changedConnections.filter((c) => !moved.includes(c))).toEqual([id])
    expect(diff.savedRoutes).toEqual({ unchanged: savedIds.size - 1, changed: 1 })
  })

  it('a replaced trace counts as changed even when its copper comes back the same', () => {
    // A trace in a baseline violation with a later trace, so moving its copper to the end of the
    // rerouted set flips that violation's item order: it must still not count as added.
    const ids = new Set(saved.traces.map((t) => t.connection))
    const pair = drc(input, saved).violations.find((v) => v.items.length === 2 && v.items.every((i) => ids.has(i)))!
    const target = toSimplifiedPcbTraces(input, saved).find((t) => input.connections[Number(t.connection_name.slice(1))]!.id === pair.items[0])!
    const returned = [{ ...target, pcb_trace_id: `${target.pcb_trace_id}_preloaded`, __replaces_pcb_trace_id: target.pcb_trace_id }]
    const { routes: after, replaced } = mergeReroute(input, saved, toRouteSet(input, returned), returned)
    const diff = rerouteDiff(input, saved, after, moved, replaced)
    expect(diff.savedRoutes.changed).toBe(1)
    expect(diff.changedConnections).toEqual(replaced)
    expect(diff.drc.added).toBe(0)
  })

  it('fixed copper hit: a new trace within clearance of a fixed:<i> segment', () => {
    const nets = fixedCopperNets(input)
    const conn = input.connections.find((c) => c.id === moved[0])!
    const i = input.fixedCopper.findIndex((t, k) => nets[k] !== undefined && nets[k] !== conn.net && Math.hypot(t.end.x - t.start.x, t.end.y - t.start.y) > 1)
    const f = input.fixedCopper[i]!
    const len = Math.hypot(f.end.x - f.start.x, f.end.y - f.start.y)
    // Parallel, 0.1 mm copper to copper: under every class clearance.
    const off = f.width / 2 + 0.1 + 0.075
    const n = { x: -(f.end.y - f.start.y) / len, y: (f.end.x - f.start.x) / len }
    const hit: RouteTrace = {
      connection: conn.id,
      net: conn.net,
      layer: f.layer,
      width: 0.15,
      points: [f.start, f.end].map((p) => ({ x: p.x + n.x * off, y: p.y + n.y * off })),
    }
    const diff = rerouteDiff(input, saved, union(saved, { traces: [hit], vias: [] }), moved)
    expect(diff.fixedCopperViolations).toBeGreaterThanOrEqual(1)
    expect(diff.drc.added).toBeGreaterThanOrEqual(diff.fixedCopperViolations)
  })

  it('counts a saved connection the engine dropped as changed', () => {
    const id = saved.traces[0]!.connection
    const after: RouteSet = { traces: saved.traces.filter((t) => t.connection !== id), vias: saved.vias }
    const diff = rerouteDiff(input, saved, after, moved)
    expect(diff.changedConnections).toEqual([id])
    expect(diff.savedRoutes.changed).toBe(1)
  })
})
