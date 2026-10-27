import { describe, expect, it } from 'vitest'
import { readFootprintEdgeCuts, readKicadPcb, readSegments } from '../../fixtures/src/kicad-pcb'
import { CORNEY } from './corney'
import { drc, obstacleIds } from './drc'
import { addedViolations, drcCases, EDGE_GAP, HOLE_GAP, PAIR_GAP, THIN_WIDTH } from './drc-cases'
import { EMPTY_ROUTES, emptyScorecard, fixedCopperNets, type RouteSet } from './route-set'
import { toRoutingInput } from './routing-input'
import { edgeGap, padShape, shapeGap, traceShape, viaShape, type Shape } from './shapes'
import { netTable, writeProject, writeRoutes, writeRules } from './write-back'

const inputs = { wired: toRoutingInput(CORNEY.wired), wireless: toRoutingInput(CORNEY.wireless) }
const cases = Object.fromEntries(drcCases(inputs).map((c) => [c.name, c]))
const baselines = { wired: drc(inputs.wired, EMPTY_ROUTES), wireless: drc(inputs.wireless, EMPTY_ROUTES) }
/** The violations a case's routes add over its bare board. */
const run = (name: string) => {
  const c = cases[name]!
  return addedViolations(baselines[c.design], drc(inputs[c.design], c.routes))
}

describe('shapes', () => {
  const dot = (x: number, y: number): Shape => viaShape({ x, y }, 0)

  it('rotates a rect pad: 2 × 1 at 90° is 1 wide in x', () => {
    const pad = padShape({ shape: 'rect', x: 0, y: 0, r: 90, size: { w: 2, h: 1 } })
    expect(shapeGap(pad, dot(1.5, 0)).d).toBeCloseTo(1, 9)
    expect(shapeGap(pad, dot(0, 2)).d).toBeCloseTo(1, 9)
    const tilted = padShape({ shape: 'rect', x: 0, y: 0, r: 45, size: { w: 2, h: 2 } })
    expect(shapeGap(tilted, dot(2, 0)).d).toBeCloseTo(2 - Math.SQRT2, 9)
  })

  it('rounds a roundrect corner exactly, and a 0 ratio is the full rect', () => {
    const size = { w: 2, h: 2 }
    const round = padShape({ shape: 'roundrect', x: 0, y: 0, r: 0, size }, 0.25)
    // Corner radius 0.5: the corner circle's centre is (0.5, 0.5).
    expect(shapeGap(round, dot(2, 2)).d).toBeCloseTo(Math.hypot(1.5, 1.5) - 0.5, 9)
    expect(shapeGap(round, dot(2, 0)).d).toBeCloseTo(1, 9)
    const square = padShape({ shape: 'roundrect', x: 0, y: 0, r: 0, size }, 0)
    expect(shapeGap(square, dot(2, 2)).d).toBeCloseTo(Math.SQRT2, 9)
  })

  it('cuts KiCad chamfers from a rect pad', () => {
    const base = { shape: 'rect', x: 0, y: 0, r: 0, size: { w: 2, h: 2 } }
    const cut = padShape({ ...base, chamfer: { ratio: 0.5, corners: ['bottom_right'] } })
    // Bottom right (y down) cut by 1 mm: the line x + y = 1, so (2, 2) is (3 / √2) away.
    expect(shapeGap(cut, dot(2, 2)).d).toBeCloseTo(3 / Math.SQRT2, 9)
    expect(shapeGap(cut, dot(-2, -2)).d).toBeCloseTo(Math.SQRT2, 9)
    // Corney's switch pad 1 is chamfered towards its hole: with the chamfer it clears 0.25 mm.
    const s1 = inputs.wired.pads.find((p) => p.id === 'S1.1.F')!
    expect(s1.chamfer).toEqual({ ratio: 0.455, corners: ['bottom_right'] })
  })

  it('makes an oval a capsule along its long side, rotated', () => {
    const oval = padShape({ shape: 'oval', x: 0, y: 0, r: 90, size: { w: 3, h: 1 } })
    // Long side along y after 90°: ends at (0, ±1) with radius 0.5.
    expect(shapeGap(oval, dot(0, 3)).d).toBeCloseTo(1.5, 9)
    expect(shapeGap(oval, dot(2, 0)).d).toBeCloseTo(1.5, 9)
  })

  it('measures traces to Edge.Cuts lines, arcs and circles', () => {
    const t = traceShape({ x: -1, y: 1 }, { x: 1, y: 1 }, 0.2)
    expect(edgeGap(t, { kind: 'line', start: { x: -5, y: 0 }, end: { x: 5, y: 0 } }).d).toBeCloseTo(0.9, 9)
    // Arc of radius 3 round the origin through (0, 3): the trace at y = 1 is 2 − 0.1 inside it.
    const arc = { kind: 'arc' as const, start: { x: -3, y: 0 }, mid: { x: 0, y: 3 }, end: { x: 3, y: 0 } }
    expect(edgeGap(t, arc).d).toBeCloseTo(3 - Math.hypot(1, 1) - 0.1, 9)
    // The same arc's other half (through (0, −3)): nearest are its ends at (±3, 0).
    const away = { ...arc, mid: { x: 0, y: -3 } }
    expect(edgeGap(t, away).d).toBeCloseTo(Math.hypot(2, 1) - 0.1, 9)
    const circle = { kind: 'circle' as const, centre: { x: 0, y: 1 }, radius: 0.5 }
    expect(edgeGap(t, circle).d).toBe(0)
    expect(edgeGap(viaShape({ x: 0, y: 0 }, 0.4), circle).d).toBeCloseTo(0.3, 9)
  })
})

describe('footprint Edge.Cuts', () => {
  it('moves an fp_rect to world coordinates with the footprint rotation, as its four sides', () => {
    const board = `(kicad_pcb (footprint "x" (layer "F.Cu") (at 10 20 90) (property "Reference" "LED1")
      (fp_rect (start -1 -2) (end 1 2) (layer "Edge.Cuts"))
      (fp_line (start 0 0) (end 1 0) (layer "F.SilkS"))))`
    const cuts = readFootprintEdgeCuts(board)
    expect(cuts).toHaveLength(4)
    expect(cuts.every((c) => c.reference === 'LED1')).toBe(true)
    const first = cuts[0]!.segment
    if (first.kind !== 'line') throw new Error('line expected')
    // (−1, −2) rotated by 90° (x' = x cos + y sin, y' = −x sin + y cos) is (−2, 1).
    expect(first.start.x).toBeCloseTo(8, 9)
    expect(first.start.y).toBeCloseTo(21, 9)
  })

  it('joins the routing input outline after the top-level graphics', () => {
    expect(inputs.wired.outline).toHaveLength(readKicadPcb(CORNEY.wired).edgeCuts.length + 27 * 4)
    expect(inputs.wireless.outline).toHaveLength(readKicadPcb(CORNEY.wireless).edgeCuts.length)
  })
})

describe('drc matrix', () => {
  it('bare wireless: no violations', () => {
    expect(baselines.wireless.violations).toEqual([])
  })

  it('bare wired: the baseline is every LED pad against its own footprint cutout, 0.21 mm', () => {
    const owners = [
      ...readKicadPcb(CORNEY.wired).edgeCuts.map(() => undefined),
      ...readFootprintEdgeCuts(CORNEY.wired).map((c) => c.reference),
    ]
    expect(owners).toHaveLength(inputs.wired.outline.length)
    const ref = new Map(inputs.wired.pads.map((p) => [p.id, p.reference]))
    const { violations, byKind } = baselines.wired
    expect(violations).toHaveLength(216)
    expect(byKind['edge-clearance']).toBe(216)
    for (const v of violations) {
      const pad = ref.get(v.items[0]!)
      expect(pad, v.items.join(' ')).toMatch(/^LED\d+$/)
      expect(owners[Number(v.items[1]!.slice('edge:'.length))]).toBe(pad)
      expect(v.actual).toBeCloseTo(0.21, 9)
    }
    // 27 LEDs × 8 pads (4 per side), each reported once.
    expect(new Set(violations.map((v) => v.items[0])).size).toBe(27 * 8)
  })

  it('clean: two signal traces 0.17 mm apart add nothing', () => {
    expect(run('clean')).toEqual([])
  })

  it('one violation: a GND trace 0.17 mm from a signal trace fails power’s 0.20 mm', () => {
    const added = run('violation')
    expect(added).toHaveLength(1)
    const v = added[0]!
    expect(v).toMatchObject({ kind: 'clearance', class: 'power', required: 0.2 })
    expect(v.actual).toBeCloseTo(PAIR_GAP, 9)
    expect([...v.items].sort()).toEqual(cases.violation!.routes.traces.map((t) => t.connection).sort())
    const { byClass, byKind } = drc(inputs.wired, cases.violation!.routes)
    expect(byClass.power).toBe(baselines.wired.byClass.power + 1)
    expect(byKind).toEqual({ clearance: 1, short: 0, 'track-width': 0, 'edge-clearance': 216, 'hole-clearance': 0 })
  })

  it('edge: a trace 0.2 mm from an Edge.Cuts line', () => {
    const added = run('edge')
    expect(added).toHaveLength(1)
    expect(added[0]).toMatchObject({ kind: 'edge-clearance', class: 'signal', required: 0.3 })
    expect(added[0]!.actual).toBeCloseTo(EDGE_GAP, 9)
  })

  it('hole: a trace 0.2 mm from a mounting hole’s edge fails the 0.25 mm hole clearance', () => {
    const added = run('hole')
    expect(added).toHaveLength(1)
    expect(added[0]).toMatchObject({ kind: 'hole-clearance', class: 'signal', required: 0.25 })
    expect(added[0]!.items[1]).toMatch(/^obstacle:MH\d+/)
    expect(added[0]!.actual).toBeCloseTo(HOLE_GAP, 9)
    expect(inputs.wired.rules.holeClearance).toBe(0.25)
  })

  it('gives repeated obstacle ids a file-order suffix', () => {
    const ids = obstacleIds(inputs.wired)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('obstacle:S1.-')
    expect(ids).toContain('obstacle:S1.-.2')
  })

  it('short: an exact touch and a crossing, and width', () => {
    expect(run('short-touch')).toMatchObject([{ kind: 'short', class: 'signal', actual: 0 }])
    expect(run('short-crossing')).toMatchObject([{ kind: 'short', class: 'signal', actual: 0 }])
    expect(cases['short-crossing']!.kicadBlindSpot).toBeDefined()
    expect(cases['short-touch']!.kicadBlindSpot).toBeUndefined()
    expect(run('width')).toMatchObject([{ kind: 'track-width', class: 'signal', required: 0.15, actual: THIN_WIDTH }])
  })

  it('same net: overlapping GND traces are not checked against each other', () => {
    expect(run('same-net')).toEqual([])
  })

  it('every case adds its expected count', () => {
    for (const c of Object.values(cases)) {
      const added = run(c.name)
      expect(added.length, c.name).toBe(c.expect.total)
      for (const [kind, n] of Object.entries(c.expect.byKind)) {
        expect(added.filter((v) => v.kind === kind).length, c.name).toBe(n)
      }
    }
  })

  it('checks pads against the board edge, and a trace inside an LED cutout', () => {
    const cut = readFootprintEdgeCuts(CORNEY.wired)[0]!
    const side = cut.segment
    if (side.kind !== 'line') throw new Error('expected a cutout side')
    const net = cases.clean!.routes.traces[0]!.net
    const through: RouteSet = { traces: [{ connection: 'x', net, layer: 'F.Cu', width: 0.15, points: [side.start, side.end] }], vias: [] }
    expect(addedViolations(baselines.wired, drc(inputs.wired, through)).some((v) => v.kind === 'edge-clearance')).toBe(true)
  })

  it('takes rules from the input: a 0.25 mm signal clearance flags the clean pair', () => {
    const input = inputs.wired
    const strict = {
      ...input,
      netClasses: input.netClasses.map((c) => (c.name === 'signal' ? { ...c, clearance: 0.25 } : c)),
    }
    const ids = new Set(cases.clean!.routes.traces.map((t) => t.connection))
    const ours = drc(strict, cases.clean!.routes).violations.filter((v) => v.items.some((i) => ids.has(i)))
    expect(ours).toMatchObject([{ kind: 'clearance', class: 'signal', required: 0.25 }])
  })

  it('counts a via on both layers and names it', () => {
    const t = cases.clean!.routes.traces[0]!
    const on = t.points[0]!
    const routes: RouteSet = {
      traces: [{ ...t, layer: 'B.Cu' }],
      vias: [{ at: { x: on.x, y: on.y + 0.1 }, diameter: 0.56, drill: 0.3, net: cases.clean!.routes.traces[1]!.net }],
    }
    expect(addedViolations(baselines.wired, drc(inputs.wired, routes))).toMatchObject([
      { kind: 'short', items: [t.connection, 'via:0'] },
    ])
  })
})

describe('writeRoutes', () => {
  const input = inputs.wired
  const routes = cases.violation!.routes

  it('appends one segment per polyline step with the board’s net numbers, and changes no geometry', () => {
    const out = writeRoutes(CORNEY.wired, input, routes)
    const before = readSegments(CORNEY.wired)
    const after = readSegments(out)
    expect(after).toHaveLength(before.length + 2)
    expect(after.slice(0, before.length).map((s) => [s.start, s.end, s.width, s.layer])).toEqual(
      before.map((s) => [s.start, s.end, s.width, s.layer]),
    )
    expect(after.slice(before.length).map((s) => s.net)).toEqual(routes.traces.map((t) => t.net))
    // Text-additive: dropping the added `(net N)`s and the appended lines gives the input back.
    const original = new Set(CORNEY.wired.split('\n'))
    const back = out
      .split('\n')
      .map((l) => (original.has(l) ? l : l.replace(/^(\s*\(segment .*?) \(net \d+\)\)$/, '$1)')))
    const extra = back.filter((l) => !original.has(l))
    expect(extra, extra.join('\n')).toHaveLength(2)
    const norm = (s: string) => s.replaceAll(/\s+/g, ' ').trim()
    expect(norm(back.filter((l) => !extra.includes(l)).join('\n'))).toBe(norm(CORNEY.wired))
  })

  it('gives every netless pre-routed segment its fixed-copper group’s net', () => {
    const out = readSegments(writeRoutes(CORNEY.wired, input, EMPTY_ROUTES))
    const nets = fixedCopperNets(input)
    expect(nets.every((n) => n !== undefined)).toBe(true)
    expect(out.map((s) => s.net)).toEqual(nets)
    // Writing back keeps the routing input (pads, connections) as it was.
    const again = toRoutingInput(writeRoutes(CORNEY.wired, input, EMPTY_ROUTES))
    expect(again.connections).toEqual(input.connections)
    expect(again.pads).toEqual(input.pads)
  })

  it('treats a pre-routed `(net 0)` segment as netless and gives it the group net', () => {
    const board = CORNEY.wired.replace(/(\(segment [^\n]*?\(layer "[FB]\.Cu"\))\)/, '$1 (net 0))')
    expect(board).not.toBe(CORNEY.wired)
    const zeroInput = toRoutingInput(board)
    const out = readSegments(writeRoutes(board, zeroInput, EMPTY_ROUTES))
    expect(out[0]!.net).toBeDefined()
    expect(out.map((s) => s.net)).toEqual(fixedCopperNets(zeroInput))
  })

  it('writes vias with size, drill and net', () => {
    const out = writeRoutes(CORNEY.wired, input, {
      traces: [],
      vias: [{ at: { x: 1.5, y: 2.25 }, diameter: 0.56, drill: 0.3, net: 'GND' }],
    })
    expect(out).toContain(`(via (at 1.5 2.25) (size 0.56) (drill 0.3) (layers "F.Cu" "B.Cu") (net ${netTable(CORNEY.wired).get('GND')}))`)
  })

  it('throws on a net not in the board, naming it', () => {
    const bad: RouteSet = { traces: [{ ...routes.traces[0]!, net: 'NOPE' }], vias: [] }
    expect(() => writeRoutes(CORNEY.wired, input, bad)).toThrow('"NOPE"')
  })
})

describe('writeProject', () => {
  it.each(['wired', 'wireless'] as const)('%s: classes, nets, via and edge clearance', (design) => {
    const input = inputs[design]
    const pro = JSON.parse(writeProject(input, 'x'))
    const classes = Object.fromEntries(pro.net_settings.classes.map((c: { name: string }) => [c.name, c]))
    expect(classes.power).toMatchObject({ clearance: 0.2, track_width: 0.25, via_diameter: 0.56, via_drill: 0.3 })
    expect(classes.signal).toMatchObject({ clearance: 0.15, track_width: 0.15 })
    expect(classes.Default.clearance).toBe(input.rules.engineClearance)
    expect(pro.board.design_settings.rules.min_copper_edge_clearance).toBe(0.3)
    expect(pro.board.design_settings.rules.min_hole_clearance).toBe(0.25)
    const patterns = pro.net_settings.netclass_patterns as Array<{ netclass: string; pattern: string }>
    for (const c of input.netClasses) {
      expect(patterns.filter((p) => p.netclass === c.name).map((p) => p.pattern).sort()).toEqual([...c.nets].sort())
    }
    expect(writeRules(input)).toContain(`(condition "A.NetClass == 'power'")`)
  })
})

describe('scorecard', () => {
  it('starts empty, with fixed-copper left out of completion', () => {
    const s = emptyScorecard({ name: 'tscircuit', version: '0.0.1010' }, 'wired')
    expect(s.connections.byRealisation['fixed-copper'].completionPct).toBeNull()
    expect(s.reroute).toBeUndefined()
    expect(s.drc.byKind).toEqual({ clearance: 0, short: 0, 'track-width': 0, 'edge-clearance': 0, 'hole-clearance': 0 })
    expect(s.baseline).toEqual({
      drc: { errors: 0, byClass: { power: 0, signal: 0, default: 0 }, byKind: s.drc.byKind },
      kicad: { clearanceFamily: {}, other: {}, capped: [] },
    })
  })
})
