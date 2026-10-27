import { describe, expect, it } from 'vitest'
import { completionCounts, routedConnections, unroutedConnections } from './completion'
import type { RouteSet } from './route-set'
import type { RoutingInput, RoutingPad } from './routing-input'

function pad(id: string, x: number, y: number, layers: RoutingPad['layers'] = ['F.Cu']): RoutingPad {
  const [reference, pin] = id.split('.') as [string, string]
  return {
    id,
    reference,
    pin,
    copper: layers.length > 1 ? 'TH' : layers[0] === 'F.Cu' ? 'F' : 'B',
    net: 'N',
    type: layers.length > 1 ? 'thru_hole' : 'smd',
    shape: 'rect',
    x,
    y,
    r: 0,
    size: { w: 1, h: 1 },
    drill: undefined,
    layers,
  }
}

const input: RoutingInput = {
  outline: [],
  pads: [pad('A.1.F', 0, 0), pad('B.1.F', 10, 0), pad('C.1.B', 10, 10, ['B.Cu']), pad('D.1.F', 20, 0)],
  obstacles: [],
  fixedCopper: [],
  keepOuts: [],
  netClasses: [{ name: 'signal', traceWidth: 0.15, clearance: 0.15, nets: ['N'] }],
  rules: {
    layers: ['F.Cu', 'B.Cu'],
    engineClearance: 0.15,
    boardEdgeClearance: 0.3,
    holeClearance: 0.25,
    via: { diameter: 0.56, drill: 0.3 },
  },
  connections: [
    { id: 'N:A.1.F~B.1.F', net: 'N', padA: 'A.1.F', padB: 'B.1.F', realisedBy: 'routing' },
    { id: 'N:B.1.F~C.1.B', net: 'N', padA: 'B.1.F', padB: 'C.1.B', realisedBy: 'key-cell' },
    { id: 'N:C.1.B~D.1.F', net: 'N', padA: 'C.1.B', padB: 'D.1.F', realisedBy: 'fixed-copper' },
  ],
}

const ab = 'N:A.1.F~B.1.F'
const bc = 'N:B.1.F~C.1.B'
const trace = (connection: string, layer: 'F.Cu' | 'B.Cu', ...points: Array<[number, number]>) => ({
  connection,
  net: 'N',
  layer,
  width: 0.15,
  points: points.map(([x, y]) => ({ x, y })),
})

describe('routedConnections', () => {
  it('counts a trace from pad to pad, and a layer change at a via', () => {
    const routes: RouteSet = {
      traces: [
        trace(ab, 'F.Cu', [0, 0], [5, 0.3], [10, 0]),
        trace(bc, 'F.Cu', [10, 0], [10, 5]),
        trace(bc, 'B.Cu', [10, 5], [10, 10]),
      ],
      vias: [{ at: { x: 10, y: 5 }, diameter: 0.56, drill: 0.3, net: 'N' }],
    }
    expect(routedConnections(input, routes)).toEqual([ab, bc])
  })

  it('counts a trace that ends anywhere on the pad copper', () => {
    const routes: RouteSet = { traces: [trace(ab, 'F.Cu', [0.4, 0.4], [9.6, -0.4])], vias: [] }
    expect(routedConnections(input, routes)).toEqual([ab])
  })

  it('does not count a trace that ends off a pad', () => {
    const routes: RouteSet = { traces: [trace(ab, 'F.Cu', [0, 0], [9.4, 0])], vias: [] }
    expect(routedConnections(input, routes)).toEqual([])
  })

  it('does not count a trace that reaches a pad on a layer the pad lacks', () => {
    const routes: RouteSet = { traces: [trace(ab, 'F.Cu', [0, 0], [5, 0]), trace(ab, 'B.Cu', [5, 0], [10, 0])], vias: [{ at: { x: 5, y: 0 }, diameter: 0.56, drill: 0.3, net: 'N' }] }
    expect(routedConnections(input, routes)).toEqual([])
  })

  it('does not count a layer change with no via', () => {
    const routes: RouteSet = { traces: [trace(bc, 'F.Cu', [10, 0], [10, 5]), trace(bc, 'B.Cu', [10, 5], [10, 10])], vias: [] }
    expect(routedConnections(input, routes)).toEqual([])
  })

  it('does not count a via of another net', () => {
    const routes: RouteSet = {
      traces: [trace(bc, 'F.Cu', [10, 0], [10, 5]), trace(bc, 'B.Cu', [10, 5], [10, 10])],
      vias: [{ at: { x: 10, y: 5 }, diameter: 0.56, drill: 0.3, net: 'M' }],
    }
    expect(routedConnections(input, routes)).toEqual([])
  })

  it('does not count a trace in two pieces', () => {
    const routes: RouteSet = { traces: [trace(ab, 'F.Cu', [0, 0], [4, 0]), trace(ab, 'F.Cu', [6, 0], [10, 0])], vias: [] }
    expect(routedConnections(input, routes)).toEqual([])
  })

  it("does not count another connection's trace", () => {
    const routes: RouteSet = { traces: [trace(bc, 'F.Cu', [0, 0], [10, 0])], vias: [] }
    expect(routedConnections(input, routes)).toEqual([])
  })
})

describe('completionCounts', () => {
  it('counts per realisation and leaves fixed copper out of completion', () => {
    const routed = [ab]
    expect(completionCounts(input, routed)).toEqual({
      total: 2,
      routed: 1,
      completionPct: 50,
      byRealisation: {
        'key-cell': { total: 1, routed: 0, completionPct: 0 },
        'fixed-copper': { total: 1, routed: 0, completionPct: null },
        routing: { total: 1, routed: 1, completionPct: 100 },
      },
    })
    expect(unroutedConnections(input, routed)).toEqual([bc])
  })
})

describe('unroutedConnections', () => {
  it('lists only the unrouted key-cell and routing ids, never fixed copper', () => {
    expect(unroutedConnections(input, [])).toEqual([ab, bc])
    expect(unroutedConnections(input, [bc])).toEqual([ab])
    expect(unroutedConnections(input, [ab, bc])).toEqual([])
    // A routed fixed-copper id changes nothing, and an unrouted one is never listed.
    expect(unroutedConnections(input, ['N:C.1.B~D.1.F'])).toEqual([ab, bc])
  })
})
