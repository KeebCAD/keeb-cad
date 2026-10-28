// Story 12's independent references for a polygon and a circle, written without makerjs:
// `subtractCircle` (polygon − disc) and `circleMinusPolygon` (disc − polygon), both exact (lines
// and arcs), and `clipperSubtract`, clipper2's flattened polygon − disc as a third opinion.
//
// Frame-agnostic: the output is in the input's frame. Callers pass KiCad-frame points to
// compare with `toSegments`.
import { differenceD, FillRule } from 'clipper2-ts'
import type { LineSegment, Point, Segment } from '../../fixtures/src/kicad-pcb'
import { chordCount } from './flatten'

/** A vertex this close to the circle (mm) is on it; a line this close is tangent to it. */
export const ON_CIRCLE = 1e-9

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/** Even-odd point in polygon. Callers only ask about points off its boundary. */
export function insidePolygon(p: Point, polygon: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!
    const b = polygon[j]!
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/**
 * Where the edge `a → b` meets the circle, as edge parameters in [0, 1], sorted. A vertex
 * within `ON_CIRCLE` of the circle is on it (t = 0 or 1 exactly); a line within `ON_CIRCLE` of
 * tangency touches at its foot point.
 */
function edgeCircleParameters(a: Point, b: Point, centre: Point, r: number): number[] {
  const d = sub(b, a)
  const len = Math.hypot(d.x, d.y)
  const ts: number[] = []
  const onCircle = (p: Point) => Math.abs(dist(p, centre) - r) <= ON_CIRCLE
  if (onCircle(a)) ts.push(0)
  if (onCircle(b)) ts.push(1)
  // The foot of the perpendicular from the centre, and the centre's distance to the line.
  const foot = ((centre.x - a.x) * d.x + (centre.y - a.y) * d.y) / (len * len)
  const h = Math.abs((centre.x - a.x) * d.y - (centre.y - a.y) * d.x) / len
  const roots = h > r + ON_CIRCLE ? [] : Math.abs(h - r) <= ON_CIRCLE ? [foot] : [-1, 1].map((s) => foot + (s * Math.sqrt(r * r - h * h)) / len)
  for (const t of roots) {
    // A root within ON_CIRCLE (in length) of a vertex is that vertex.
    if (t * len < -ON_CIRCLE || (t - 1) * len > ON_CIRCLE) continue
    if (Math.abs(t) * len <= ON_CIRCLE || Math.abs(t - 1) * len <= ON_CIRCLE) continue
    ts.push(t)
  }
  return [...new Set(ts)].sort((x, y) => x - y)
}

type Mode = 'polygon-minus-disc' | 'disc-minus-polygon'

/**
 * The boundary of polygon − disc or disc − polygon. Each edge is split where it meets the
 * circle and its pieces kept by their midpoint (outside the disc, or inside it); the circle is
 * split at those points and its arcs kept by their mid-angle point (inside the polygon, or
 * outside it). Kept pieces that continue each other through a split point that bounds no other
 * kept piece (a tangent touch) are joined again, so tangency never splits a segment.
 */
function cut(polygon: readonly Point[], centre: Point, r: number, mode: Mode): Segment[] {
  const keepLine = (mid: Point) => (mode === 'polygon-minus-disc' ? dist(mid, centre) > r : dist(mid, centre) < r)
  const keepArc = (mid: Point) => (mode === 'polygon-minus-disc' ? insidePolygon(mid, polygon) : !insidePolygon(mid, polygon))

  const lines: LineSegment[] = []
  const onCircle: Point[] = []
  for (const [i, a] of polygon.entries()) {
    const b = polygon[(i + 1) % polygon.length]!
    const ts = edgeCircleParameters(a, b, centre, r)
    for (const t of ts) onCircle.push(t === 0 ? a : t === 1 ? b : lerp(a, b, t))
    const cuts = [0, ...ts.filter((t) => t > 0 && t < 1), 1]
    let open: Point | undefined
    for (let k = 1; k < cuts.length; k++) {
      const from = lerp(a, b, cuts[k - 1]!)
      const to = cuts[k] === 1 ? b : lerp(a, b, cuts[k]!)
      const kept = dist(from, to) > ON_CIRCLE && keepLine(lerp(a, b, (cuts[k - 1]! + cuts[k]!) / 2))
      if (kept) open ??= cuts[k - 1] === 0 ? a : from
      if (!kept && open) {
        lines.push({ kind: 'line', start: open, end: from })
        open = undefined
      }
      if (kept && k === cuts.length - 1) lines.push({ kind: 'line', start: open!, end: to })
    }
  }

  // The circle's split points, by angle, one per point (within ON_CIRCLE).
  const angleOf = (p: Point) => Math.atan2(p.y - centre.y, p.x - centre.x)
  const splits: { angle: number; at: Point }[] = []
  for (const p of onCircle.toSorted((p, q) => angleOf(p) - angleOf(q))) {
    if (!splits.some((s) => dist(s.at, p) <= ON_CIRCLE)) splits.push({ angle: angleOf(p), at: p })
  }
  const pointAt = (angle: number): Point => ({ x: centre.x + r * Math.cos(angle), y: centre.y + r * Math.sin(angle) })

  if (splits.length === 0) {
    // The circle meets no edge: it is wholly inside or wholly outside the polygon.
    return keepArc(pointAt(0)) ? [...lines, { kind: 'circle', centre, radius: r }] : lines
  }

  // Arc k runs from split k to split k + 1 (counter-clockwise in angle terms).
  const n = splits.length
  const kept = splits.map((s, k) => {
    const to = k + 1 < n ? splits[k + 1]!.angle : splits[0]!.angle + 2 * Math.PI
    return keepArc(pointAt((s.angle + to) / 2))
  })
  if (kept.every(Boolean)) return [...lines, { kind: 'circle', centre, radius: r }]
  // A split point that bounds a kept line piece ends an arc; any other (a touch) does not.
  const endsLine = (p: Point) => lines.some((l) => dist(l.start, p) <= ON_CIRCLE || dist(l.end, p) <= ON_CIRCLE)
  const arcs: Segment[] = []
  // Start at a split that ends an arc run, so no run wraps past the start.
  const first = splits.findIndex((s, k) => !kept[(k + n - 1) % n] || endsLine(s.at))
  let k = first
  do {
    if (!kept[k]) {
      k = (k + 1) % n
      continue
    }
    const start = k
    let end = (k + 1) % n
    while (kept[end] && !endsLine(splits[end]!.at) && end !== start) end = (end + 1) % n
    const a0 = splits[start]!.angle
    let a1 = splits[end]!.angle
    while (a1 <= a0) a1 += 2 * Math.PI
    arcs.push({ kind: 'arc', start: splits[start]!.at, mid: pointAt((a0 + a1) / 2), end: splits[end]!.at })
    k = end
  } while (k !== first)
  return [...lines, ...arcs]
}

/** The exact boundary of `polygon` minus the disc of radius `r` about `centre`. */
export function subtractCircle(polygon: readonly Point[], centre: Point, r: number): Segment[] {
  return cut(polygon, centre, r, 'polygon-minus-disc')
}

/** The exact boundary of the disc minus `polygon`. */
export function circleMinusPolygon(polygon: readonly Point[], centre: Point, r: number): Segment[] {
  return cut(polygon, centre, r, 'disc-minus-polygon')
}

/** The polygon's edges as line segments. */
export const polygonSegments = (polygon: readonly Point[]): LineSegment[] =>
  polygon.map((a, i) => ({ kind: 'line', start: a, end: polygon[(i + 1) % polygon.length]! }))

/** Closed polyline loops as line segments (each loop closes onto its first point). */
export const loopSegments = (loops: readonly (readonly Point[])[]): LineSegment[] => loops.flatMap((loop) => polygonSegments(loop))

/** clipper2-ts decimal places: 1e-6 mm. */
export const CLIPPER_PRECISION = 6

/**
 * clipper2's polygon − disc: the circle as `chordCount(r, 2π, tol)` equal chords (every chord
 * within `tol` inside the true circle), subtracted with `differenceD` at 1e-6 mm.
 */
export function clipperSubtract(polygon: readonly Point[], centre: Point, r: number, tol = 0.001): Point[][] {
  const n = chordCount(r, 2 * Math.PI, tol)
  const circle = Array.from({ length: n }, (_, i) => {
    const t = (2 * Math.PI * i) / n
    return { x: centre.x + r * Math.cos(t), y: centre.y + r * Math.sin(t) }
  })
  const result = differenceD([polygon.map((p) => ({ x: p.x, y: p.y }))], [circle], FillRule.NonZero, CLIPPER_PRECISION)
  return result.map((path) => path.map((p) => ({ x: p.x, y: p.y })))
}
