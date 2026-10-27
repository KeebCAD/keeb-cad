import type { Obstacle } from '@tscircuit/capacity-autorouter'
import { describe, expect, it } from 'vitest'
import type { Point } from '../../fixtures/src/kicad-pcb'
import { routedConnections } from './completion'
import { CORNEY, type CorneyDesign } from './corney'
import type { RouteSet } from './route-set'
import { toRoutingInput, type RoutingInput, type RoutingPad } from './routing-input'
import { padShape } from './shapes'
import {
  boardLoops,
  connectionIndex,
  OUTLINE_TOLERANCE,
  toRouteSet,
  toSimpleRouteJson,
  toSimplifiedPcbTraces,
} from './tscircuit-adapter'

const line = (a: Point, b: Point) => ({ kind: 'line' as const, start: a, end: b })
const box = (x0: number, y0: number, x1: number, y1: number) => [
  line({ x: x0, y: y0 }, { x: x1, y: y0 }),
  line({ x: x1, y: y0 }, { x: x1, y: y1 }),
  line({ x: x1, y: y1 }, { x: x0, y: y1 }),
  line({ x: x0, y: y1 }, { x: x0, y: y0 }),
]

function pad(over: Partial<RoutingPad> & Pick<RoutingPad, 'id' | 'x' | 'y'>): RoutingPad {
  return {
    reference: over.id.split('.')[0]!,
    pin: over.id.split('.')[1]!,
    copper: 'F',
    net: 'ROW1',
    type: 'smd',
    shape: 'rect',
    r: 0,
    size: { w: 1, h: 1 },
    drill: undefined,
    layers: ['F.Cu'],
    ...over,
  }
}

/** A 40 × 20 mm board with one 2 × 1 mm cutout, a 30° rect SMD pad and a TH circle pad. */
const small: RoutingInput = {
  outline: [...box(0, 0, 40, 20), ...box(30, 2, 32, 3)],
  pads: [
    pad({ id: 'U1.1.F', x: 5, y: 6, r: 30, size: { w: 2, h: 1 } }),
    pad({
      id: 'J1.1.TH',
      x: 25,
      y: 14,
      copper: 'TH',
      type: 'thru_hole',
      shape: 'circle',
      size: { w: 1.7, h: 1.7 },
      drill: { w: 1, h: 1 },
      layers: ['F.Cu', 'B.Cu'],
    }),
  ],
  obstacles: [
    {
      reference: 'MH1',
      pin: '',
      type: 'np_thru_hole',
      shape: 'circle',
      x: 20,
      y: 3,
      r: 0,
      size: { w: 2.2, h: 2.2 },
      drill: { w: 2.2, h: 2.2 },
      layers: ['F.Cu', 'B.Cu'],
    },
  ],
  fixedCopper: [],
  keepOuts: [],
  netClasses: [
    { name: 'power', traceWidth: 0.25, clearance: 0.2, nets: [] },
    { name: 'signal', traceWidth: 0.15, clearance: 0.15, nets: ['ROW1'] },
  ],
  rules: {
    layers: ['F.Cu', 'B.Cu'],
    engineClearance: 0.2,
    boardEdgeClearance: 0.3,
    holeClearance: 0.25,
    via: { diameter: 0.56, drill: 0.3 },
  },
  connections: [{ id: 'ROW1:U1.1.F~J1.1.TH', net: 'ROW1', padA: 'U1.1.F', padB: 'J1.1.TH', realisedBy: 'routing' }],
}

/** An SRJ rect obstacle's corners, back in KiCad's frame (y down). */
function corners(o: Obstacle): Point[] {
  const t = ((o.ccwRotationDegrees ?? 0) * Math.PI) / 180
  const [c, s] = [Math.cos(t), Math.sin(t)]
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([u, v]) => {
    const x = (u! * o.width) / 2
    const y = (v! * o.height) / 2
    return { x: o.center.x + x * c - y * s, y: -(o.center.y + x * s + y * c) }
  })
}

/** Each of `a` has a point of `b` within 1e-9 (order free). */
function sameCorners(a: Point[], b: Point[]): void {
  expect(a).toHaveLength(b.length)
  for (const p of a) expect(Math.min(...b.map((q) => Math.hypot(p.x - q.x, p.y - q.y)))).toBeLessThan(1e-9)
}

describe('toSimpleRouteJson on a small board', () => {
  const srj = toSimpleRouteJson(small)
  const byId = new Map(srj.obstacles.map((o) => [o.obstacleId, o]))

  it('takes every rule from RoutingInput', () => {
    expect(srj).toMatchObject({
      layerCount: 2,
      minTraceWidth: 0.25,
      minViaPadDiameter: 0.56,
      minViaHoleDiameter: 0.3,
      defaultObstacleMargin: 0.2,
      minTraceToPadEdgeClearance: 0.2,
      minViaEdgeToPadEdgeClearance: 0.2,
      minPadEdgeToPadEdgeClearance: 0.2,
      minTraceToHoleEdgeClearance: 0.25,
      minBoardEdgeClearance: 0.3,
    })
    expect(srj.connections[0]).toMatchObject({ name: 'c0', netConnectionName: 'ROW1', nominalTraceWidth: 0.15 })
  })

  it('puts a rotated rect pad where KiCad has it, after the y-flip', () => {
    const o = byId.get('U1.1.F')!
    expect(o).toMatchObject({ layers: ['top'], width: 2, height: 1, ccwRotationDegrees: 30, connectedTo: ['ROW1', 'c0'] })
    const shape = padShape(small.pads[0]!)
    if (shape.core.kind !== 'polygon') throw new Error('rect pad should be a polygon')
    sameCorners(corners(o), shape.core.pts)
  })

  it('makes a TH circle pad a both-layer circle, and the NPTH hole a non-plated hole', () => {
    expect(byId.get('J1.1.TH')).toMatchObject({
      shape: 'circle',
      layers: ['top', 'bottom'],
      center: { x: 25, y: -14 },
      width: 1.7,
      height: 1.7,
    })
    expect(byId.get('obstacle:0')).toMatchObject({
      isNonPlatedHole: true,
      shape: 'circle',
      layers: ['top', 'bottom'],
      center: { x: 20, y: -3 },
      width: 2.2,
      connectedTo: [],
    })
  })

  it('connects pad centres, one layer for SMD and both for TH', () => {
    expect(srj.connections[0]!.pointsToConnect).toEqual([
      { x: 5, y: -6, layer: 'top', pointId: 'c0.A' },
      { x: 25, y: -14, layers: ['top', 'bottom'], pointId: 'c0.B' },
    ])
  })

  it('outlines the board and grows each cutout to the board-edge clearance', () => {
    expect(srj.outline).toEqual([
      { x: 0, y: -0 },
      { x: 40, y: -0 },
      { x: 40, y: -20 },
      { x: 0, y: -20 },
    ])
    expect(srj.bounds).toEqual({ minX: 0, maxX: 40, minY: -20, maxY: -0 })
    const cut = byId.get('cutout:0')!
    expect(cut.layers).toEqual(['top', 'bottom'])
    expect(cut.center).toEqual({ x: 31, y: -2.5 })
    expect(cut.width).toBeCloseTo(2.2, 12)
    expect(cut.height).toBeCloseTo(1.2, 12)
  })
})

describe('RouteSet round trip', () => {
  const via = { x: 15, y: 10 }
  const routes: RouteSet = {
    traces: [
      { connection: small.connections[0]!.id, net: 'ROW1', layer: 'F.Cu', width: 0.15, points: [{ x: 5, y: 6 }, { x: 10, y: 6 }, via] },
      { connection: small.connections[0]!.id, net: 'ROW1', layer: 'B.Cu', width: 0.15, points: [via, { x: 25, y: 14 }] },
    ],
    vias: [{ at: via, diameter: 0.56, drill: 0.3, net: 'ROW1' }],
  }

  it('flips the points and puts the via between the layers', () => {
    const [trace] = toSimplifiedPcbTraces(small, routes)
    expect(trace!.connection_name).toBe('c0')
    expect(trace!.route.map((h) => [h.route_type, 'x' in h ? h.x : 0, 'y' in h ? h.y : 0])).toEqual([
      ['wire', 5, -6],
      ['wire', 10, -6],
      ['wire', 15, -10],
      ['via', 15, -10],
      ['wire', 15, -10],
      ['wire', 25, -14],
    ])
  })

  it('comes back to the same RouteSet within 1e-6 mm, and counts as routed', () => {
    const back = toRouteSet(small, toSimplifiedPcbTraces(small, routes))
    expect(back.unknown).toEqual([])
    expect(back.skipped).toEqual([])
    expect(back.vias).toEqual(routes.vias)
    expect(back.traces).toHaveLength(routes.traces.length)
    for (const [i, t] of back.traces.entries()) {
      const want = routes.traces[i]!
      expect({ ...t, points: [] }).toEqual({ ...want, points: [] })
      expect(t.points).toHaveLength(want.points.length)
      for (const [k, p] of t.points.entries()) {
        expect(Math.hypot(p.x - want.points[k]!.x, p.y - want.points[k]!.y)).toBeLessThan(1e-6)
      }
    }
    expect(routedConnections(small, back)).toEqual([small.connections[0]!.id])
  })

  it('reports names that map to no connection instead of dropping them', () => {
    const [trace] = toSimplifiedPcbTraces(small, routes)
    const back = toRouteSet(small, [{ ...trace!, connection_name: 'c9' }, { ...trace!, connection_name: 'x' }])
    expect(back.unknown).toEqual(['c9', 'x'])
    expect(back.traces).toEqual([])
    expect(connectionIndex('c12')).toBe(12)
    expect(connectionIndex('c12_mst0')).toBeUndefined()
  })
})

describe('toSimpleRouteJson on Corney', () => {
  const DESIGNS = Object.keys(CORNEY) as CorneyDesign[]
  const expected = {
    wired: { connections: 333, cutouts: 27 },
    wireless: { connections: 152, cutouts: 0 },
  } as const

  for (const design of DESIGNS) {
    describe(design, () => {
      const input = toRoutingInput(CORNEY[design])
      const srj = toSimpleRouteJson(input)
      const ids = new Set(srj.obstacles.map((o) => o.obstacleId))

      it('routes every key-cell and routing connection, never fixed copper', () => {
        expect(srj.connections).toHaveLength(expected[design].connections)
        const realised = srj.connections.map((c) => input.connections[connectionIndex(c.name)!]!.realisedBy)
        expect(realised.filter((r) => r === 'fixed-copper')).toEqual([])
        const want = input.connections.filter((c) => c.realisedBy !== 'fixed-copper').length
        expect(srj.connections).toHaveLength(want)
      })

      it('has every pad, obstacle pad, fixed-copper segment and cutout as an obstacle', () => {
        for (const p of input.pads) expect(ids.has(p.id), p.id).toBe(true)
        expect(srj.obstacles.filter((o) => o.obstacleId?.startsWith('obstacle:'))).toHaveLength(input.obstacles.length)
        expect(srj.obstacles.filter((o) => o.obstacleId?.startsWith('fixed:'))).toHaveLength(input.fixedCopper.length)
        expect(srj.obstacles.filter((o) => o.obstacleId?.startsWith('cutout:'))).toHaveLength(expected[design].cutouts)
        const npth = input.obstacles.filter((o) => o.type === 'np_thru_hole').length
        expect(srj.obstacles.filter((o) => o.isNonPlatedHole)).toHaveLength(npth)
      })

      it('flattens the outline within the chord tolerance', () => {
        const { board } = boardLoops(input)
        expect(srj.outline).toHaveLength(board.length)
        // Every chord between two vertices of one arc stays within the tolerance of its circle.
        for (const e of input.outline) {
          if (e.kind !== 'arc') continue
          const [p, q, r] = [e.start, e.mid, e.end]
          const d = 2 * (p.x * (q.y - r.y) + q.x * (r.y - p.y) + r.x * (p.y - q.y))
          const n = (v: Point) => v.x * v.x + v.y * v.y
          const c = {
            x: (n(p) * (q.y - r.y) + n(q) * (r.y - p.y) + n(r) * (p.y - q.y)) / d,
            y: (n(p) * (r.x - q.x) + n(q) * (p.x - r.x) + n(r) * (q.x - p.x)) / d,
          }
          const R = Math.hypot(p.x - c.x, p.y - c.y)
          const onArc = board.filter((v) => Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - R) < 1e-6)
          expect(onArc.length, 'arc vertices on the outline').toBeGreaterThanOrEqual(2)
          for (const [i, a] of board.entries()) {
            const b = board[(i + 1) % board.length]!
            if (!onArc.includes(a) || !onArc.includes(b)) continue
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
            expect(R - Math.hypot(mid.x - c.x, mid.y - c.y)).toBeLessThanOrEqual(OUTLINE_TOLERANCE + 1e-9)
          }
        }
      })
    })
  }
})
