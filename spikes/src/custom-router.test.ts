import { beforeAll, describe, expect, it } from 'vitest'
import { routedConnections } from './completion'
import { CORNEY } from './corney'
import { routeConnections, type RouteResult } from './custom-router'
import { drc } from './drc'
import { addedViolations } from './drc-cases'
import { EMPTY_ROUTES } from './route-set'
import { toRoutingInput, type FixedTrace, type RoutingInput, type RoutingPad } from './routing-input'

const input = toRoutingInput(CORNEY.wired)
const baseline = drc(input, EMPTY_ROUTES)

/** The spike's MCU connections: 4 signal, and GND for the power width. */
const MCU_IDS = [
  'RST:MCU1.122.TH~RST1.1.TH',
  'DAT:MCU1.102.TH~TRRS1.3.TH',
  'SDA:DISP1.27.B~MCU1.105.B',
  'SCL:DISP1.26.B~MCU1.106.B',
  'GND:MCU1.123.TH~RST1.2.TH',
]
const GND = 'GND:MCU1.123.TH~RST1.2.TH'

/**
 * The chosen set (spike decision, for story 9): every `key-cell` connection, every `routing`
 * connection on C0–C5 and R0–R3, and the 5 MCU connections.
 */
export const MATRIX_IDS: readonly string[] = [
  ...input.connections
    .filter((c) => c.realisedBy === 'key-cell' || (c.realisedBy === 'routing' && /^(C[0-5]|R[0-3])$/.test(c.net)))
    .map((c) => c.id),
  ...MCU_IDS,
]

const added = (routes: RouteResult['routes']) => addedViolations(baseline, drc(input, routes))

describe('custom router on wired Corney', () => {
  let result: RouteResult
  let ms: number

  beforeAll(() => {
    const t0 = performance.now()
    result = routeConnections(input, MATRIX_IDS)
    ms = performance.now() - t0
    console.log(
      `custom router: ${routedConnections(input, result.routes).length}/${MATRIX_IDS.length} routed in ${ms.toFixed(0)} ms (Node), ` +
        `${result.routes.traces.length} traces, ${result.routes.vias.length} vias, unrouted ${result.unrouted.length}`,
    )
  }, 120_000)

  it('chooses 131 connections, all of them known and none fixed copper', () => {
    expect(MATRIX_IDS).toHaveLength(131)
    expect(new Set(MATRIX_IDS).size).toBe(131)
    const byId = new Map(input.connections.map((c) => [c.id, c]))
    for (const id of MATRIX_IDS) expect(byId.get(id)?.realisedBy, id).not.toBe('fixed-copper')
    expect(byId.get(GND)?.net).toBe('GND')
  })

  it('routes the matrix: all 131 realised, none unrouted, no added drc violation, under 120 s', () => {
    expect(result.unrouted).toEqual([])
    const routed = routedConnections(input, result.routes)
    expect(MATRIX_IDS.filter((id) => !routed.includes(id))).toEqual([])
    expect(added(result.routes)).toEqual([])
    expect(ms).toBeLessThan(120_000)
  })

  it('tags every trace with a chosen connection and its net', () => {
    const byId = new Map(input.connections.map((c) => [c.id, c]))
    for (const t of result.routes.traces) {
      expect(MATRIX_IDS).toContain(t.connection)
      expect(t.net).toBe(byId.get(t.connection)!.net)
    }
  })

  it('routes the power connection at the power width, and signal at the signal width', () => {
    const width = (cls: string) => input.netClasses.find((c) => c.name === cls)!.traceWidth
    const gnd = result.routes.traces.filter((t) => t.connection === GND)
    expect(gnd.length).toBeGreaterThan(0)
    for (const t of gnd) expect(t.width).toBe(width('power'))
    expect(width('power')).toBe(0.25)
    for (const t of result.routes.traces.filter((t) => t.connection !== GND)) expect(t.width).toBe(width('signal'))
  })

  it('is deterministic', () => {
    const ids = MATRIX_IDS.filter((id) => id.startsWith('R1:') || id.startsWith('C2:'))
    expect(routeConnections(input, ids)).toEqual(routeConnections(input, ids))
  })
})

describe('custom router edge cases', () => {
  it('routes two chained connections of one net that share a pad, with nothing between them', () => {
    const ids = ['R0:D3.1.B~D6.1.B', 'R0:D6.1.B~D9.1.B']
    const { routes, unrouted } = routeConnections(input, ids)
    expect(unrouted).toEqual([])
    expect(routedConnections(input, routes)).toEqual(ids)
    expect(added(routes)).toEqual([])
  })

  it('leaves a boxed-in connection unrouted and emits nothing for it', () => {
    const id = 'outer_bottom_B:D1.2.B~S1.2.B'
    const pad = input.pads.find((p) => p.id === 'D1.2.B')!
    // A closed netless ring on both layers, clear of the pad's copper.
    const h = 1
    const corners = [
      { x: pad.x - h, y: pad.y - h },
      { x: pad.x + h, y: pad.y - h },
      { x: pad.x + h, y: pad.y + h },
      { x: pad.x - h, y: pad.y + h },
    ]
    const ring: FixedTrace[] = (['F.Cu', 'B.Cu'] as const).flatMap((layer) =>
      corners.map((start, i) => ({ start, end: corners[(i + 1) % 4]!, width: 0.2, layer, net: undefined })),
    )
    const boxed: RoutingInput = { ...input, fixedCopper: [...input.fixedCopper, ...ring] }
    const { routes, unrouted } = routeConnections(boxed, [id])
    expect(unrouted).toEqual([id])
    expect(routes.traces.filter((t) => t.connection === id)).toEqual([])
    expect(routes.vias).toEqual([])
  })

  it('throws on an unknown id, naming it', () => {
    expect(() => routeConnections(input, ['R0:NOPE.1.F~NOPE.2.F'])).toThrow('R0:NOPE.1.F~NOPE.2.F')
  })

  it('throws on a connection realised by fixed copper, naming it', () => {
    const fixed = input.connections.find((c) => c.realisedBy === 'fixed-copper')!
    expect(() => routeConnections(input, [fixed.id])).toThrow(fixed.id)
  })
})

/**
 * A one-layer box (B.Cu is a keep-out, so no vias): `B` runs the length of the box, and the
 * shorter `A` crosses it, so the first pass routes `A` straight across and `B` has no way past.
 * `A` can go round `B`'s left pad instead, which only a rip-up finds.
 */
function crossingBox(): RoutingInput {
  const pad = (net: string, ref: string, x: number, y: number): RoutingPad => ({
    id: `${ref}.1.F`,
    reference: ref,
    pin: '1',
    copper: 'F',
    net,
    type: 'smd',
    shape: 'rect',
    x,
    y,
    r: 0,
    size: { w: 0.6, h: 0.6 },
    drill: undefined,
    layers: ['F.Cu'],
  })
  const corners = [
    { x: -3, y: -2 },
    { x: 13, y: -2 },
    { x: 13, y: 2 },
    { x: -3, y: 2 },
  ]
  const ring: FixedTrace[] = corners.map((start, i) => ({ start, end: corners[(i + 1) % 4]!, width: 0.2, layer: 'F.Cu', net: undefined }))
  const pads = [pad('A', 'PA1', 5, -1.2), pad('A', 'PA2', 5, 1.2), pad('B', 'PB1', 0, 0), pad('B', 'PB2', 10, 0)]
  return {
    outline: [],
    pads,
    obstacles: [],
    fixedCopper: ring,
    keepOuts: [{ id: 'no-back', polygon: corners.map((p) => ({ x: p.x * 2, y: p.y * 2 })), layers: ['B.Cu'] }],
    netClasses: [{ name: 'signal', traceWidth: 0.15, clearance: 0.15, nets: ['A', 'B'] }],
    rules: input.rules,
    connections: [
      { id: 'A:PA1.1.F~PA2.1.F', net: 'A', padA: 'PA1.1.F', padB: 'PA2.1.F', realisedBy: 'routing' },
      { id: 'B:PB1.1.F~PB2.1.F', net: 'B', padA: 'PB1.1.F', padB: 'PB2.1.F', realisedBy: 'routing' },
    ],
  }
}

describe('custom router rip-up and reroute', () => {
  const box = crossingBox()
  const ids = box.connections.map((c) => c.id)
  const [A, B] = ids as [string, string]
  const boxAdded = (routes: RouteResult['routes']) => addedViolations(drc(box, EMPTY_ROUTES), drc(box, routes))

  it('without rip-up, the connection blocked by an earlier one is unrouted; alone, it routes', () => {
    const first = routeConnections(box, ids, { ripUpRounds: 0 })
    expect(routedConnections(box, first.routes)).toEqual([A])
    expect(first.unrouted).toEqual([B])
    const alone = routeConnections(box, [B])
    expect(alone.unrouted).toEqual([])
    expect(routedConnections(box, alone.routes)).toEqual([B])
  })

  it('rips up the earlier connection, places the blocked one, and reroutes the ripped one round it', () => {
    const { routes, unrouted, timedOut } = routeConnections(box, ids)
    expect(unrouted).toEqual([])
    expect(timedOut).toBe(false)
    expect(routedConnections(box, routes).sort()).toEqual([...ids].sort())
    expect(boxAdded(routes)).toEqual([])
    expect(routes.vias).toEqual([])
    // A no longer goes straight across: it goes round B's left pad.
    const xs = routes.traces.filter((t) => t.connection === A).flatMap((t) => t.points.map((p) => p.x))
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(routeConnections(box, ids)).toEqual({ routes, unrouted, timedOut })
  })
})

describe('custom router deadline', () => {
  const box = crossingBox()
  const ids = box.connections.map((c) => c.id)

  it('stops between connections once the injected clock passes the deadline, keeping what it placed', () => {
    let t = 0
    // Read once before each connection: 0 (A goes), then 1 > 0 (B is not started).
    const result = routeConnections(box, ids, { deadlineMs: 0, now: () => t++ })
    expect(result.timedOut).toBe(true)
    expect(routedConnections(box, result.routes)).toEqual([ids[0]])
    expect(result.unrouted).toEqual([ids[1]])
  })

  it('does not time out before a deadline it does not reach', () => {
    const result = routeConnections(box, ids, { deadlineMs: 1e9, now: () => 0 })
    expect(result.timedOut).toBe(false)
    expect(result.unrouted).toEqual([])
  })
})
