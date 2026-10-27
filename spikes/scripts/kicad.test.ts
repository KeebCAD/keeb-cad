import { describe, expect, it } from 'vitest'
import type { DrcViolation } from '../src/drc'
import type { RouteSet } from '../src/route-set'
import type { RoutingInput } from '../src/routing-input'
import { drcSignatures } from './kicad'

const conn = 'N:A.1.TH~B.1.TH'
const input: RoutingInput = {
  outline: [],
  pads: [
    {
      id: 'P.1.B',
      reference: 'P',
      pin: '1',
      copper: 'B',
      net: 'M',
      type: 'smd',
      shape: 'rect',
      x: 5,
      y: 1,
      r: 0,
      size: { w: 1, h: 1 },
      drill: undefined,
      layers: ['B.Cu'],
    },
  ],
  obstacles: [],
  fixedCopper: [],
  keepOuts: [],
  netClasses: [{ name: 'signal', traceWidth: 0.15, clearance: 0.15, nets: ['N', 'M'] }],
  rules: {
    layers: ['F.Cu', 'B.Cu'],
    engineClearance: 0.2,
    boardEdgeClearance: 0.3,
    holeClearance: 0.25,
    via: { diameter: 0.56, drill: 0.3 },
  },
  connections: [],
}

describe('drcSignatures', () => {
  it('names the layer of a both-layer connection that the violation is on', () => {
    // The B.Cu trace runs at y = 0; the F.Cu trace, listed last, runs right through the point.
    const routes: RouteSet = {
      traces: [
        { connection: conn, net: 'N', layer: 'B.Cu', width: 0.15, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
        { connection: conn, net: 'N', layer: 'F.Cu', width: 0.15, points: [{ x: 0, y: 0.45 }, { x: 10, y: 0.45 }] },
      ],
      vias: [],
    }
    const v: DrcViolation = {
      kind: 'clearance',
      class: 'signal',
      items: ['P.1.B', conn],
      required: 0.15,
      actual: 0.1,
      at: { x: 5, y: 0.45 },
    }
    expect(drcSignatures(input, routes)(v)).toBe('clearance|pad:P.1.B|track:N.B.Cu')
  })

  it('names the nearer layer when every item has both', () => {
    const routes: RouteSet = {
      traces: [
        { connection: conn, net: 'N', layer: 'B.Cu', width: 0.15, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
        { connection: conn, net: 'N', layer: 'F.Cu', width: 0.15, points: [{ x: 0, y: 3 }, { x: 10, y: 3 }] },
      ],
      vias: [{ at: { x: 5, y: 0.4 }, diameter: 0.56, drill: 0.3, net: 'M' }],
    }
    const v: DrcViolation = { kind: 'clearance', class: 'signal', items: [conn, 'via:0'], required: 0.15, actual: 0.05, at: { x: 5, y: 0.1 } }
    expect(drcSignatures(input, routes)(v)).toBe('clearance|track:N.B.Cu|via:M')
  })
})
