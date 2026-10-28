// Story 12: makerjs arc booleans against an independent exact reference (`circle-cut.ts`), with
// clipper2 as a third opinion. One test per row of the plan's I/O matrix (Latency is
// `e2e/outline.spec.ts`), plus unit tests of the reference on hand-computed cases.
import { EndType, inflatePathsD, JoinType } from 'clipper2-ts'
import makerjs from 'makerjs'
import { describe, expect, test } from 'vitest'
import type { Point, Segment } from '../../fixtures/src/kicad-pcb'
import { chainLoops, compareSegments, formatItemComparison, PCB_TOLERANCE } from '../../fixtures/src/pcb-geometry'
import points from '../../fixtures/corney-island/ergogen/points/points.yaml?raw'
import {
  circleMinusPolygon,
  CLIPPER_PRECISION,
  clipperSubtract,
  insidePolygon,
  loopSegments,
  polygonSegments,
  subtractCircle,
} from './circle-cut'
import {
  arcGeometry,
  distanceToSegment,
  flatten,
  flattenedDeviation,
  fromSegments,
  mergeCollinear,
  toSegments,
  vertexCount,
} from './flatten'
import {
  CORNEY_OUTLINE_ID,
  CORNEY_OUTLINE_SHAPES,
  evaluate,
  LAMBBT_OUTLINE_ID,
  LAMBBT_OUTLINE_SHAPES,
  LAMBBT_POSES,
  placedCircle,
  placedPolygon,
  readPoints,
  type OutlineShapes,
  type Pose,
  type Shape,
  type Vertex,
} from './outline-shapes'

const TOL = 0.005
/** Below this, mm, a segment has zero length. */
const ZERO_LENGTH = 1e-6

const kicad = ([x, y]: readonly [number, number]): Point => ({ x, y: -y })
const ref = (id: string) => ({ kind: 'shape-ref' as const, id })
const fmt = (p: Point) => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`

function model(shapes: OutlineShapes, id: string, poses: ReadonlyMap<string, Pose>): makerjs.IModel {
  const result = evaluate(shapes, id, poses)
  if (result.kind !== 'model') throw new Error(`${result.id}: ${result.reason}`)
  return result.model
}

/** LambBT's `pcb` with its circle replaced (centre vertex and radius). */
function lambbtWith(circle: Partial<{ centre: Vertex; radius: number }>): OutlineShapes {
  return {
    ...LAMBBT_OUTLINE_SHAPES,
    shapes: LAMBBT_OUTLINE_SHAPES.shapes.map((s): Shape => (s.kind === 'circle' ? { ...s, ...circle } : s)),
  }
}

/** The board polygon and the circle, KiCad frame: the reference's inputs. */
function lambbtInputs(shapes: OutlineShapes, poses: ReadonlyMap<string, Pose> = LAMBBT_POSES) {
  const polygon = placedPolygon(shapes, 'board', poses).map(kicad)
  const { centre, radius } = placedCircle(shapes, 'cutout_circle_small', poses)
  return { polygon, centre: kicad(centre), radius }
}

/** makerjs's exact result (collinear splits merged), its raw paths, and the reference. */
function check(shapes: OutlineShapes, id: string, poses: ReadonlyMap<string, Pose>, expected: readonly Segment[]) {
  const m = model(shapes, id, poses)
  const raw = toSegments(m)
  const { segments, joins } = mergeCollinear(raw)
  const result = compareSegments(expected, segments)
  return { model: m, raw, segments, joins, result }
}

const shortest = (segments: readonly Segment[]) =>
  Math.min(...segments.map((s) => (s.kind === 'circle' ? Infinity : Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y))))

describe('subtractCircle (the reference), hand-computed', () => {
  const square: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ]
  const line = (ax: number, ay: number, bx: number, by: number): Segment => ({
    kind: 'line',
    start: { x: ax, y: ay },
    end: { x: bx, y: by },
  })
  const exact = (got: readonly Segment[], want: readonly Segment[]) => {
    const result = compareSegments(want, got, { tolerance: 1e-12 })
    expect(result.pass, formatItemComparison(result)).toBe(true)
  }

  test('a circle through (1, 0) and (9, 0) cuts a bump out of the bottom edge', () => {
    // Centre (5, −3), r 5: x = 5 ± 4 on y = 0, top of the circle at (5, 2).
    exact(subtractCircle(square, { x: 5, y: -3 }, 5), [
      line(0, 0, 1, 0),
      line(9, 0, 10, 0),
      line(10, 0, 10, 10),
      line(10, 10, 0, 10),
      line(0, 10, 0, 0),
      { kind: 'arc', start: { x: 9, y: 0 }, mid: { x: 5, y: 2 }, end: { x: 1, y: 0 } },
    ])
  })

  test('a circle about a corner removes a quarter disc, the arc through both edges', () => {
    const r = 5
    exact(subtractCircle(square, { x: 0, y: 0 }, r), [
      line(5, 0, 10, 0),
      line(10, 0, 10, 10),
      line(10, 10, 0, 10),
      line(0, 10, 0, 5),
      { kind: 'arc', start: { x: 5, y: 0 }, mid: { x: r * Math.SQRT1_2, y: r * Math.SQRT1_2 }, end: { x: 0, y: 5 } },
    ])
  })

  test('a circle through a vertex (10, 0) and (0, 0) splits no edge at either', () => {
    // Centre (5, −5), r √50: through (0, 0) and (10, 0), apex (5, 5·(√2 − 1)).
    const r = Math.hypot(5, 5)
    const got = subtractCircle(square, { x: 5, y: -5 }, r)
    exact(got, [
      line(10, 0, 10, 10),
      line(10, 10, 0, 10),
      line(0, 10, 0, 0),
      { kind: 'arc', start: { x: 10, y: 0 }, mid: { x: 5, y: r - 5 }, end: { x: 0, y: 0 } },
    ])
    expect(shortest(got)).toBeGreaterThan(ZERO_LENGTH)
  })

  test('a circle tangent to an edge from outside leaves the square unchanged', () => {
    exact(subtractCircle(square, { x: 5, y: -4 }, 4), polygonSegments(square))
  })

  test('a circle wholly inside is a hole; a circle wholly outside changes nothing', () => {
    exact(subtractCircle(square, { x: 5, y: 5 }, 2), [...polygonSegments(square), { kind: 'circle', centre: { x: 5, y: 5 }, radius: 2 }])
    exact(subtractCircle(square, { x: 30, y: 5 }, 2), polygonSegments(square))
  })

  test('circleMinusPolygon: the disc about a corner keeps three quarters of its circle', () => {
    const r = 5
    const c = Math.SQRT1_2 * r
    exact(circleMinusPolygon(square, { x: 0, y: 0 }, r), [
      line(5, 0, 0, 0),
      line(0, 0, 0, 5),
      { kind: 'arc', start: { x: 0, y: 5 }, mid: { x: -c, y: -c }, end: { x: 5, y: 0 } },
    ])
  })
})

describe('LambBT: board − r 150 circle', () => {
  const inputs = lambbtInputs(LAMBBT_OUTLINE_SHAPES)
  const expected = subtractCircle(inputs.polygon, inputs.centre, inputs.radius)

  test('exact: makerjs matches the reference, one closed chain, the arc on the cutting circle', () => {
    const { raw, segments, joins, result } = check(LAMBBT_OUTLINE_SHAPES, LAMBBT_OUTLINE_ID, LAMBBT_POSES, expected)
    const max = Math.max(...result.items.map((i) => i.deviation))
    console.log(
      `LambBT cut: ${raw.length} makerjs paths, ${joins.length} collinear join(s), reference ${expected.length} ` +
        `segments, max exact deviation ${max.toExponential(2)} mm`,
    )
    console.log(formatItemComparison(result))
    expect(result.pass, formatItemComparison(result)).toBe(true)
    expect(chainLoops(raw)).toHaveLength(1)
    const arcs = segments.filter((s) => s.kind === 'arc')
    expect(arcs).toHaveLength(1)
    const g = arcGeometry(arcs[0]!)
    const centreError = Math.hypot(g.centre.x - inputs.centre.x, g.centre.y - inputs.centre.y)
    const radiusError = Math.abs(g.radius - inputs.radius)
    console.log(`LambBT arc: centre off by ${centreError.toExponential(2)} mm, radius by ${radiusError.toExponential(2)} mm`)
    expect(centreError).toBeLessThanOrEqual(1e-6)
    expect(radiusError).toBeLessThanOrEqual(1e-6)
  })

  test(`flattened at tol ${TOL}: within ${PCB_TOLERANCE} mm of the reference, and of clipper2`, () => {
    const m = model(LAMBBT_OUTLINE_SHAPES, LAMBBT_OUTLINE_ID, LAMBBT_POSES)
    const loops = flatten(m, TOL)
    expect(loops).toHaveLength(1)
    const d = flattenedDeviation(expected, loops)
    const clipper = clipperSubtract(inputs.polygon, inputs.centre, inputs.radius)
    const c = flattenedDeviation(loopSegments(clipper), loops)
    const cRef = flattenedDeviation(expected, clipper)
    console.log(
      `LambBT flattened: ${vertexCount(loops)} vertices, deviation ${d.deviation.toFixed(5)} mm (bound ` +
        `${d.bound.toFixed(5)}); clipper2 (${clipper.length} loop, ${vertexCount(clipper)} vertices) vs makerjs ` +
        `${c.deviation.toFixed(5)} (bound ${c.bound.toFixed(5)}), clipper2 vs reference ${cRef.deviation.toFixed(5)} ` +
        `(bound ${cRef.bound.toFixed(5)})`,
    )
    expect(d.bound, `worst at ${fmt(d.worst)}`).toBeLessThanOrEqual(PCB_TOLERANCE)
    expect(d.polylineToReference).toBeLessThanOrEqual(TOL)
    expect(clipper).toHaveLength(1)
    expect(c.bound, `clipper2 vs makerjs, worst at ${fmt(c.worst)}`).toBeLessThanOrEqual(PCB_TOLERANCE)
    expect(cRef.bound, `clipper2 vs reference, worst at ${fmt(cRef.worst)}`).toBeLessThanOrEqual(PCB_TOLERANCE)
  })

  test('arc through a vertex: r set to pinky bottom-left corner, matches, no zero-length or duplicate segment', () => {
    const vertex = inputs.polygon[1]!
    const radius = Math.hypot(vertex.x - inputs.centre.x, vertex.y - inputs.centre.y)
    const shapes = lambbtWith({ radius })
    const want = subtractCircle(inputs.polygon, inputs.centre, radius)
    const { raw, joins, result } = check(shapes, LAMBBT_OUTLINE_ID, LAMBBT_POSES, want)
    console.log(
      `arc through vertex ${fmt(vertex)} (r ${radius.toFixed(6)}): ${raw.length} makerjs paths, ${joins.length} join(s), ` +
        `reference ${want.length}, shortest makerjs path ${shortest(raw).toExponential(2)} mm, ` +
        `${result.duplicate.length} duplicate(s)`,
    )
    console.log(formatItemComparison(result))
    expect(result.pass, formatItemComparison(result)).toBe(true)
    expect(shortest(raw)).toBeGreaterThan(ZERO_LENGTH)
    expect(chainLoops(raw)).toHaveLength(1)
    // The arc ends on the vertex itself.
    const arc = want.find((s) => s.kind === 'arc')!
    expect(arc.kind === 'arc' && Math.min(Math.hypot(arc.start.x - vertex.x, arc.start.y - vertex.y), Math.hypot(arc.end.x - vertex.x, arc.end.y - vertex.y))).toBe(0)
  })

  test('tangent outside: a r 150 circle touching the left edge from outside leaves the board unchanged', () => {
    // The left edge, pinky top-left → bottom-left: every other vertex lies to one side of it.
    const [a, b] = [inputs.polygon[0]!, inputs.polygon[1]!]
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    const normal = { x: (b.y - a.y) / length, y: -(b.x - a.x) / length }
    const side = (p: Point) => (p.x - a.x) * normal.x + (p.y - a.y) * normal.y
    const others = inputs.polygon.slice(2).map(side)
    const sign = Math.sign(others[0]!)
    expect(others.every((s) => Math.sign(s) === sign && Math.abs(s) > 1)).toBe(true)
    // Centre on the far side, r from the edge's midpoint (KiCad frame; the shape model is Ergogen's).
    const centre = { x: (a.x + b.x) / 2 - sign * normal.x * 150, y: (a.y + b.y) / 2 - sign * normal.y * 150 }
    const poses = new Map(LAMBBT_POSES).set('tangent_centre', { x: centre.x, y: -centre.y, r: 0 })
    const shapes = lambbtWith({ centre: { anchor: 'tangent_centre' } })
    const board = polygonSegments(inputs.polygon)
    expect(compareSegments(board, subtractCircle(inputs.polygon, centre, 150), { tolerance: 0 }).pass, 'reference').toBe(true)
    const { raw, segments, joins, result } = check(shapes, LAMBBT_OUTLINE_ID, poses, board)
    const exactRaw = compareSegments(board, raw)
    const foot = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    console.log(
      `tangent outside: ${raw.length} makerjs paths (board ${board.length}), ${raw.filter((s) => s.kind !== 'line').length} ` +
        `arcs; joins at ${joins.map((p) => `${fmt(p)}, ${Math.hypot(p.x - foot.x, p.y - foot.y).toExponential(2)} mm from the touch point`).join('; ')}`,
    )
    console.log(formatItemComparison(exactRaw))
    // The finding: makerjs splits the touched edge at the touch point (no arc, nothing removed).
    // `mergeCollinear` joins it back; the merged result is the board, segment for segment.
    expect(exactRaw.pass, 'raw makerjs paths: the touched edge comes back split').toBe(false)
    expect(raw).toHaveLength(board.length + 1)
    expect(joins).toHaveLength(1)
    expect(Math.hypot(joins[0]!.x - foot.x, joins[0]!.y - foot.y)).toBeLessThanOrEqual(1e-6)
    expect(result.pass, formatItemComparison(result)).toBe(true)
    expect(segments).toHaveLength(board.length)
  })

  test('concentric re-cut: (board − circle) − the same circle equals one cut', () => {
    const shapes: OutlineShapes = {
      ...LAMBBT_OUTLINE_SHAPES,
      shapes: [...LAMBBT_OUTLINE_SHAPES.shapes, { id: 'pcb_again', kind: 'subtract', from: ref('pcb'), cut: [ref('cutout_circle_small')] }],
    }
    const { raw, result } = check(shapes, 'pcb_again', LAMBBT_POSES, expected)
    console.log(`concentric re-cut: ${raw.length} makerjs paths (one cut: ${expected.length})`)
    console.log(formatItemComparison(result))
    expect(result.pass, formatItemComparison(result)).toBe(true)
    expect(chainLoops(raw)).toHaveLength(1)
  })

  test('mounting hole: board − a r 1.1 circle wholly inside stays a whole circle, flattens to 2 loops', () => {
    // At matrix_middle_home, well inside the board.
    const shapes = lambbtWith({ centre: { anchor: 'matrix_middle_home' }, radius: 1.1 })
    const hole = lambbtInputs(shapes)
    const want = subtractCircle(hole.polygon, hole.centre, hole.radius)
    expect(want.filter((s) => s.kind === 'circle')).toHaveLength(1)
    const { model: m, raw, result } = check(shapes, LAMBBT_OUTLINE_ID, LAMBBT_POSES, want)
    console.log(
      `mounting hole: ${raw.length} makerjs paths (${raw.map((s) => s.kind).filter((k) => k !== 'line').join(', ') || 'lines only'})`,
    )
    console.log(formatItemComparison(result))
    expect(result.pass, formatItemComparison(result)).toBe(true)
    expect(raw.filter((s) => s.kind === 'circle')).toHaveLength(1)
    const loops = flatten(m, TOL)
    expect(loops).toHaveLength(2)
    expect(flattenedDeviation(want, loops).bound).toBeLessThanOrEqual(PCB_TOLERANCE)
  })

  test('negative control: the circle centre moved 0.06 mm (towards the board) fails both checks', () => {
    // Along y, the arc's normal at its middle: a move along x slides the circle almost along its
    // own top and no point of the boundary moves 0.05 mm.
    const shapes = lambbtWith({ centre: { anchor: 'matrix_middle_bottom', shift: [-13, -188 + 0.06] } })
    const { model: m, result } = check(shapes, LAMBBT_OUTLINE_ID, LAMBBT_POSES, expected)
    const failing = result.items.filter((i) => !i.pass)
    const d = flattenedDeviation(expected, flatten(m, TOL))
    console.log(
      `negative control: failing ${failing.map((i) => `${i.name} ${i.deviation.toFixed(4)} mm`).join(', ')}; ` +
        `flattened deviation ${d.deviation.toFixed(4)} mm`,
    )
    expect(result.pass).toBe(false)
    // The sampled value is a lower bound on the true one, so the check fails for certain.
    expect(d.deviation).toBeGreaterThan(PCB_TOLERANCE)
  })
})

// Small cases in a bare frame: one anchor at the origin.
const ORIGIN = new Map<string, Pose>([['o', { x: 0, y: 0, r: 0 }]])
const at = (x: number, y: number): Vertex => ({ anchor: 'o', shift: [x, y] })
const box = (id: string, x0: number, y0: number, x1: number, y1: number): Shape => ({
  id,
  kind: 'polygon',
  vertices: [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)],
})

describe('#377 coincident edges: 100² box − 50² box sharing its top and right edges', () => {
  // The L, KiCad frame (y flipped).
  const L: Segment[] = (
    [
      [0, 0, 100, 0],
      [100, 0, 100, 50],
      [100, 50, 50, 50],
      [50, 50, 50, 100],
      [50, 100, 0, 100],
      [0, 100, 0, 0],
    ] as const
  ).map(([ax, ay, bx, by]) => ({ kind: 'line', start: { x: ax, y: -ay }, end: { x: bx, y: -by } }))
  const subtract = (cutter: Shape): OutlineShapes => ({
    constructions: [],
    shapes: [box('a', 0, 0, 100, 100), cutter, { id: 'l', kind: 'subtract', from: ref('a'), cut: [ref(cutter.id)] }],
  })

  test('makerjs as is: reproduced, the shared edges stay and the chain is open', () => {
    const { raw, result } = check(subtract(box('b', 50, 50, 100, 100)), 'l', ORIGIN, L)
    let chain = 'closed'
    try {
      chainLoops(raw)
    } catch (e) {
      chain = String(e)
    }
    const simplified = toSegments(makerjs.model.simplify(model(subtract(box('b', 50, 50, 100, 100)), 'l', ORIGIN)))
    const afterSimplify = compareSegments(L, simplified)
    console.log(`#377 as is: ${raw.length} makerjs paths; chain: ${chain}`)
    console.log(formatItemComparison(result))
    console.log(`#377 + model.simplify: ${simplified.length} paths, ${afterSimplify.pass ? 'pass' : 'fail'}`)
    console.log(formatItemComparison(afterSimplify))
    // The finding: these must stay red. If makerjs ever fixes #377, this test says so.
    expect(result.pass).toBe(false)
    expect(chain).not.toBe('closed')
    expect(afterSimplify.pass).toBe(false)
  })

  test('workaround: the cutter extended 10 mm past the shared edges gives the L, 6 lines, one loop', () => {
    const { raw, joins, result } = check(subtract(box('b', 50, 50, 110, 110)), 'l', ORIGIN, L)
    console.log(`#377 workaround: ${raw.length} makerjs paths, ${joins.length} join(s)`)
    console.log(formatItemComparison(result))
    expect(result.pass, formatItemComparison(result)).toBe(true)
    expect(raw).toHaveLength(6)
    expect(chainLoops(raw)).toHaveLength(1)
  })
})

test('#509 stray lines: r 402.7 circle − triangle whose right edge is vertical', () => {
  // The vertical edge x = 400 crosses the circle at y = ±46.55, so a 2.7 mm sliver right of it
  // is a second loop.
  const triangle: [number, number][] = [
    [300, 0],
    [400, -100],
    [400, 100],
  ]
  const shapes: OutlineShapes = {
    constructions: [],
    shapes: [
      { id: 't', kind: 'polygon', vertices: triangle.map(([x, y]) => at(x, y)) },
      { id: 'c', kind: 'circle', centre: at(0, 0), radius: 402.7 },
      { id: 's', kind: 'subtract', from: ref('c'), cut: [ref('t')] },
    ],
  }
  const polygon = triangle.map(kicad)
  const centre = { x: 0, y: 0 }
  const r = 402.7
  const want = circleMinusPolygon(polygon, centre, r)
  const { raw, result } = check(shapes, 's', ORIGIN, want)
  // On the true boundary: on the circle and not inside the triangle, or on a triangle edge and
  // not outside the circle. Every segment sampled every 0.5 mm.
  const edges = polygonSegments(polygon)
  const offBoundary = (p: Point) => {
    const onCircle = Math.abs(Math.hypot(p.x, p.y) - r) <= 1e-6 && !insidePolygon(p, polygon)
    const onEdge = edges.some((e) => distanceToSegment(p, e) <= 1e-6) && Math.hypot(p.x, p.y) <= r + 1e-6
    return !(onCircle || onEdge)
  }
  const stray: string[] = []
  for (const [index, s] of raw.entries()) {
    const off = flattenedSamples(s).find(offBoundary)
    if (off) stray.push(`path ${index} (${s.kind}) at ${fmt(off)}`)
  }
  const loops = chainLoops(raw)
  console.log(`#509: ${raw.length} makerjs paths, ${loops.length} closed loop(s), ${stray.length} off the boundary`)
  console.log(formatItemComparison(result))
  expect(stray).toEqual([])
  expect(loops).toHaveLength(2)
  expect(result.pass, formatItemComparison(result)).toBe(true)
})

/** Points along a segment every 0.5 mm or less (arcs by angle), ends included. */
function flattenedSamples(s: Segment): Point[] {
  if (s.kind === 'circle') throw new Error('unexpected full circle')
  if (s.kind === 'line') {
    const n = Math.max(1, Math.ceil(Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y) / 0.5))
    return Array.from({ length: n + 1 }, (_, i) => ({
      x: s.start.x + ((s.end.x - s.start.x) * i) / n,
      y: s.start.y + ((s.end.y - s.start.y) * i) / n,
    }))
  }
  const { centre, radius, startAngle, sweep } = arcGeometry(s)
  const n = Math.max(1, Math.ceil((Math.abs(sweep) * radius) / 0.5))
  return Array.from({ length: n + 1 }, (_, i) => ({
    x: centre.x + radius * Math.cos(startAngle + (sweep * i) / n),
    y: centre.y + radius * Math.sin(startAngle + (sweep * i) / n),
  }))
}

describe('#387 offset: Corney PCB outline expanded 1.45 mm (wall 1.2 + tolerance 0.25)', () => {
  const DISTANCE = 1.2 + 0.25
  const corney = readPoints(points)
  const corneyModel = () => model(CORNEY_OUTLINE_SHAPES, CORNEY_OUTLINE_ID, corney)
  const source = toSegments(corneyModel())

  /**
   * Median and max ms of `run` over 10 runs after a warm-up, and its last result. Each run gets a
   * fresh input from `prepare`, built outside the timer (makerjs may modify the model it is
   * given), so only the offset itself is timed.
   */
  function timed<I, T>(prepare: () => I, run: (input: I) => T): { result: T; medianMs: number; maxMs: number } {
    let result = run(prepare())
    const times: number[] = []
    for (let i = 0; i < 10; i++) {
      const input = prepare()
      const start = performance.now()
      result = run(input)
      times.push(performance.now() - start)
    }
    const sorted = times.toSorted((a, b) => a - b)
    return { result, medianMs: (sorted[4]! + sorted[5]!) / 2, maxMs: sorted.at(-1)! }
  }

  /** Absolute shoelace area of the loops, mm². */
  const area = (loops: readonly Point[][]) =>
    Math.abs(
      loops.reduce(
        (sum, loop) =>
          sum + loop.reduce((a, p, i) => a + p.x * loop[(i + 1) % loop.length]!.y - loop[(i + 1) % loop.length]!.x * p.y, 0),
        0,
      ) / 2,
    )
  const sourceArea = area(flatten(source, TOL))

  /** An outward offset encloses more than the source; an inward 1.45 mm loop would pass the distance check. */
  const expectOutward = (loops: readonly Point[][]) => {
    console.log(`#387 area: offset ${area(loops).toFixed(1)} mm² vs source ${sourceArea.toFixed(1)} mm²`)
    expect(area(loops)).toBeGreaterThan(sourceArea)
  }

  /** The worst |distance to the source − 1.45| over the loops' vertices and every 0.05 mm along each chord. */
  function worstOffsetError(loops: readonly Point[][]) {
    let worst = { error: 0, at: { x: NaN, y: NaN } as Point }
    for (const { start: a, end: b } of loopSegments(loops)) {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.05))
      for (let i = 0; i <= n; i++) {
        const p = { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }
        const error = Math.abs(Math.min(...source.map((s) => distanceToSegment(p, s))) - DISTANCE)
        if (error > worst.error) worst = { error, at: p }
      }
    }
    return worst
  }

  const report = (name: string, loops: readonly Point[][], t: { medianMs: number; maxMs: number }) => {
    const worst = worstOffsetError(loops)
    console.log(
      `#387 ${name}: ${loops.length} loop(s) of ${loops.map((l) => l.length).join(', ')} vertices, worst ` +
        `|distance − ${DISTANCE}| ${worst.error.toFixed(5)} mm at ${fmt(worst.at)}; offset alone median ` +
        `${t.medianMs.toFixed(1)} ms, max ${t.maxMs.toFixed(1)} ms (Node, 10 runs)`,
    )
    return worst
  }

  test('makerjs as is: reproduced, model.outline of the union-built outline is broken', () => {
    const t = timed(corneyModel, (m) => makerjs.model.outline(m, DISTANCE, 0))
    const loops = flatten(t.result, TOL)
    const worst = report('model.outline as is', loops, t)
    // The finding stays red: if makerjs ever fixes this, the test says so.
    expect(loops.length !== 1 || worst.error > PCB_TOLERANCE).toBe(true)
    // The plate outline, which has no split edge, offsets cleanly; the backplate outline (story
    // 11's split at (205.113, 52.99), no fillets) gives no loop at all.
    const plate = flatten(makerjs.model.outline(model(CORNEY_OUTLINE_SHAPES, '_plate_outline', corney), DISTANCE, 0), TOL)
    expect(plate).toHaveLength(1)
    const backplate = flatten(makerjs.model.outline(model(CORNEY_OUTLINE_SHAPES, '_backplate_outline', corney), DISTANCE, 0), TOL)
    expect(backplate).toHaveLength(0)
  })

  test('flat model, split kept (fromSegments ∘ toSegments, no merge): still broken, so the split is the cause', () => {
    const t = timed(
      () => fromSegments(toSegments(corneyModel())),
      (m) => makerjs.model.outline(m, DISTANCE, 0),
    )
    const loops = flatten(t.result, TOL)
    const worst = report('flat, unmerged, then model.outline', loops, t)
    // Flattening the nested model alone does not fix it.
    expect(loops.length !== 1 || worst.error > PCB_TOLERANCE).toBe(true)
  })

  test('workaround: collinear lines merged first (fromSegments ∘ mergeCollinear), then model.outline', () => {
    const t = timed(
      () => fromSegments(mergeCollinear(toSegments(corneyModel())).segments),
      (m) => makerjs.model.outline(m, DISTANCE, 0),
    )
    const loops = flatten(t.result, TOL)
    const worst = report('merged, then model.outline', loops, t)
    expect(loops).toHaveLength(1)
    expect(worst.error, `worst at ${fmt(worst.at)}`).toBeLessThanOrEqual(PCB_TOLERANCE)
    expectOutward(loops)
  })

  test('clipper2 alternative: inflatePathsD of the flattened outline, round joins, arc tol 0.001', () => {
    const t = timed(
      () => flatten(corneyModel(), TOL),
      (loops) =>
        inflatePathsD(loops, DISTANCE, JoinType.Round, EndType.Polygon, 2, CLIPPER_PRECISION, 0.001).map((path) =>
          path.map((p) => ({ x: p.x, y: p.y })),
        ),
    )
    const worst = report('clipper2 inflatePathsD', t.result, t)
    expect(t.result).toHaveLength(1)
    expect(worst.error, `worst at ${fmt(worst.at)}`).toBeLessThanOrEqual(PCB_TOLERANCE)
    expectOutward(t.result)
  })
})
