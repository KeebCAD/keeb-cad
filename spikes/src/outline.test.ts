// Story 11: makerjs rebuilds Corney's outline from AD-16 model shapes. One test per row of the
// plan's I/O matrix (Latency is `e2e/outline.spec.ts`), for both designs, plus the tolerance sweep.
import makerjs from 'makerjs'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { readKicadPcb, type ArcSegment, type Segment } from '../../fixtures/src/kicad-pcb'
import { compareSegments, formatItemComparison, PCB_TOLERANCE } from '../../fixtures/src/pcb-geometry'
import points from '../../fixtures/corney-island/ergogen/points/points.yaml?raw'
import { CORNEY, type CorneyDesign } from './corney'
import {
  chordCount,
  flatten,
  flattenArc,
  flattenedDeviation,
  mergeCollinear,
  toSegments,
  vertexCount,
  worstChord,
} from './flatten'
import {
  CORNEY_OUTLINE_ID,
  CORNEY_OUTLINE_SHAPES,
  evaluate,
  readPoints,
  resolveConstructions,
  type OutlineShapes,
  type Shape,
} from './outline-shapes'

const DESIGNS: CorneyDesign[] = ['wired', 'wireless']
const TOL = 0.005
const POINTS = readPoints(points)
const reference = (design: CorneyDesign): Segment[] => readKicadPcb(CORNEY[design]).edgeCuts

function model(shapes: OutlineShapes = CORNEY_OUTLINE_SHAPES): makerjs.IModel {
  const result = evaluate(shapes, CORNEY_OUTLINE_ID, POINTS)
  if (result.kind !== 'model') throw new Error(`${result.id}: ${result.reason}`)
  return result.model
}

/** The exact candidate: makerjs paths as segments, the union's collinear split merged back. */
const exact = (shapes?: OutlineShapes) => mergeCollinear(toSegments(model(shapes)))

afterEach(() => {
  vi.restoreAllMocks()
})

describe.each(DESIGNS)('%s', (design) => {
  test('exact outline: makerjs paths match the 37 Edge.Cuts segments', () => {
    const raw = toSegments(model())
    const { segments, joins } = exact()
    const result = compareSegments(reference(design), segments)
    console.log(
      `${design}: ${raw.length} makerjs paths, ${joins.length} collinear join(s) at ` +
        `${joins.map((p) => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`).join(', ')}; ` +
        `max exact deviation ${Math.max(...result.items.map((i) => i.deviation)).toExponential(2)} mm`,
    )
    console.log(formatItemComparison(result))
    expect(result.pass, formatItemComparison(result)).toBe(true)
    expect(result.items).toHaveLength(37)
    // The one known union split (README, story 11); a new split must not merge silently.
    expect(joins).toHaveLength(1)
    expect(Math.hypot(joins[0]!.x - 205.113, joins[0]!.y - 52.99), 'join at (205.113, 52.990)').toBeLessThanOrEqual(1e-3)
  })

  test(`flattened outline: tol ${TOL}, symmetric deviation ≤ ${PCB_TOLERANCE} mm, every chord within tol`, () => {
    const loops = flatten(model(), TOL)
    expect(loops).toHaveLength(1)
    const d = flattenedDeviation(reference(design), loops)
    console.log(
      `${design}: ${vertexCount(loops)} vertices, flattened deviation ${d.deviation.toFixed(5)} mm ` +
        `(bound ${d.bound.toFixed(5)}, sampled every ${d.step} mm) at (${d.worst.x.toFixed(3)}, ${d.worst.y.toFixed(3)})`,
    )
    expect(d.bound, `worst at (${d.worst.x.toFixed(3)}, ${d.worst.y.toFixed(3)})`).toBeLessThanOrEqual(PCB_TOLERANCE)
    // The loops judged here: every chord within tol of the exact outline.
    expect(d.polylineToReference, 'flattened loops to reference').toBeLessThanOrEqual(TOL)
    for (const segments of [exact().segments, reference(design)]) {
      const worst = worstChord(segments, TOL)
      const name = `arc #${worst.arc} at (${worst.at.x.toFixed(3)}, ${worst.at.y.toFixed(3)})`
      expect(worst.sagitta, `worst chord: ${name}, sagitta ${worst.sagitta}`).toBeLessThanOrEqual(TOL)
    }
  })

  test('moved vertex (negative control): 0.06 mm fails both checks', () => {
    const moved: OutlineShapes = {
      ...CORNEY_OUTLINE_SHAPES,
      shapes: CORNEY_OUTLINE_SHAPES.shapes.map((shape): Shape => {
        if (shape.id !== '_matrix_outline' || shape.kind !== 'polygon') return shape
        const vertices = shape.vertices.map((v) =>
          v.anchor === 'matrix_outer_bottom' ? { ...v, shift: [v.shift![0] + 0.06, v.shift![1]] as const } : v,
        )
        return { ...shape, vertices }
      }),
    }
    const result = compareSegments(reference(design), exact(moved).segments)
    expect(result.pass).toBe(false)
    const d = flattenedDeviation(reference(design), flatten(model(moved), TOL))
    console.log(`${design} negative control: flattened deviation ${d.deviation.toFixed(4)} mm`)
    // The sampled value is a lower bound on the true one, so the check fails for certain.
    expect(d.deviation).toBeGreaterThan(PCB_TOLERANCE)
  })

  test('tolerance sweep: vertices, deviation and flatten time per tol', () => {
    const segments = toSegments(model())
    const rows = [0.001, 0.005, 0.01, 0.025].map((tol) => {
      flatten(segments, tol) // warm-up
      const runs = 20
      const start = performance.now()
      let loops: ReturnType<typeof flatten> = []
      for (let i = 0; i < runs; i++) loops = flatten(segments, tol)
      const ms = (performance.now() - start) / runs
      const d = flattenedDeviation(reference(design), loops)
      expect(d.bound, `tol ${tol}`).toBeLessThanOrEqual(PCB_TOLERANCE)
      return { tol, vertices: vertexCount(loops), deviation: d.deviation, bound: d.bound, ms }
    })
    console.log(
      [
        `${design} sweep:`,
        '| tol mm | vertices | flattened deviation mm | bound mm | flatten ms |',
        '|---|---|---|---|---|',
        ...rows.map(
          (r) => `| ${r.tol} | ${r.vertices} | ${r.deviation.toFixed(5)} | ${r.bound.toFixed(5)} | ${r.ms.toFixed(3)} |`,
        ),
      ].join('\n'),
    )
    expect(rows.map((r) => r.vertices)).toEqual([...rows.map((r) => r.vertices)].sort((a, b) => b - a))
  })
})

test('construction points: both intersect points lie within 0.01 mm of points.yaml', () => {
  const resolved = resolveConstructions(CORNEY_OUTLINE_SHAPES, POINTS)
  for (const c of CORNEY_OUTLINE_SHAPES.constructions) {
    const got = resolved.get(c.id)
    const want = POINTS.get(c.id)
    if (!got || 'kind' in got || !want) throw new Error(`${c.id}: not resolved (${JSON.stringify(got)})`)
    const d = Math.hypot(got.x - want.x, got.y - want.y)
    console.log(`${c.id}: (${got.x}, ${got.y}), ${d.toExponential(2)} mm from points.yaml`)
    expect(d, c.id).toBeLessThanOrEqual(0.01)
  }
})

test('parallel lines: a typed construction-undefined, no throw, dependents not evaluated', () => {
  const [first, ...rest] = CORNEY_OUTLINE_SHAPES.constructions
  // mcu_cover_top_left and mcu_cover_top_right both have r = 0: their y axes are parallel.
  const parallel: OutlineShapes = {
    ...CORNEY_OUTLINE_SHAPES,
    constructions: [
      { ...first!, lines: [first!.lines[0], { through: { anchor: 'mcu_cover_top_right' }, angle: 90 }] },
      ...rest,
    ],
  }
  const fillet = vi.spyOn(makerjs.chain, 'fillet')
  const union = vi.spyOn(makerjs.model, 'combineUnion')
  const result = evaluate(parallel, CORNEY_OUTLINE_ID, POINTS)
  expect(result).toEqual({
    kind: 'construction-undefined',
    id: 'mcu_cover_bottom_left',
    reason: 'its two lines are parallel',
  })
  // The plate union (no dependency on it) ran; the backplate union and the fillet did not.
  expect(union).toHaveBeenCalledTimes(1)
  expect(fillet).not.toHaveBeenCalled()
  // A shape that does not depend on it still evaluates.
  expect(evaluate(parallel, '_plate_outline', POINTS).kind).toBe('model')
})

test('flatten bounds: r 0.5, 90°, tol 0.005 gives the formula chord count, sagitta ≤ tol', () => {
  const r = 0.5
  const arc: ArcSegment = {
    kind: 'arc',
    start: { x: r, y: 0 },
    mid: { x: r * Math.SQRT1_2, y: r * Math.SQRT1_2 },
    end: { x: 0, y: r },
  }
  const n = Math.ceil(Math.PI / 2 / (2 * Math.acos(1 - TOL / r)))
  expect(n).toBe(6)
  expect(chordCount(r, Math.PI / 2, TOL)).toBe(n)
  const points = flattenArc(arc, TOL)
  expect(points).toHaveLength(n + 1)
  const sagitta = worstChord([arc], TOL).sagitta
  expect(sagitta).toBeCloseTo(r * (1 - Math.cos(Math.PI / 4 / n)), 12)
  expect(sagitta).toBeLessThanOrEqual(TOL)
  // Equal chords.
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y))
  for (const l of lengths) expect(l).toBeCloseTo(lengths[0]!, 12)
})
