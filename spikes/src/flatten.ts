// makerjs exact paths to KiCad-frame segments, the one flatten of those into polyline loops, and
// the symmetric distance between a polyline and an exact outline (story 11).
//
// Frame: makerjs paths are in Ergogen's (y up); `toSegments` maps them to KiCad's `(x, −y)`.
// Everything else here is in KiCad's frame.
import makerjs from 'makerjs'
import type { ArcSegment, Point, Segment } from '../../fixtures/src/kicad-pcb'
import { chainLoops } from '../../fixtures/src/pcb-geometry'

const toKicad = (p: makerjs.IPoint): Point => ({ x: p[0]!, y: -p[1]! })

/**
 * Every line and arc in the model (nested models and origins applied), as KiCad-frame
 * `Segment`s: a line keeps its ends; an arc becomes start / mid / end, mid at the mid-angle.
 * Circles and other path types throw: Corney's outline has none.
 */
export function toSegments(model: makerjs.IModel): Segment[] {
  const segments: Segment[] = []
  makerjs.model.walk(model, {
    onPath(walked) {
      const path = makerjs.path.moveRelative(makerjs.path.clone(walked.pathContext), walked.offset)
      if (makerjs.isPathLine(path)) {
        const line = path as makerjs.IPathLine
        segments.push({ kind: 'line', start: toKicad(line.origin), end: toKicad(line.end) })
      } else if (makerjs.isPathArc(path)) {
        const arc = path as makerjs.IPathArc
        let end = arc.endAngle
        while (end < arc.startAngle) end += 360
        const at = (deg: number): Point =>
          toKicad([
            arc.origin[0]! + arc.radius * Math.cos((deg * Math.PI) / 180),
            arc.origin[1]! + arc.radius * Math.sin((deg * Math.PI) / 180),
          ])
        segments.push({ kind: 'arc', start: at(arc.startAngle), mid: at((arc.startAngle + end) / 2), end: at(end) })
      } else {
        throw new Error(`toSegments: unsupported path type ${path.type}`)
      }
    },
  })
  return segments
}

/** An arc's circle and its sweep from start through mid to end (signed, radians). */
export type ArcGeometry = { centre: Point; radius: number; startAngle: number; sweep: number }

export function arcGeometry(arc: ArcSegment): ArcGeometry {
  const { start: a, mid: b, end: c } = arc
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-12) throw new Error('arcGeometry: start, mid and end are collinear')
  const sq = (p: Point) => p.x * p.x + p.y * p.y
  const centre = {
    x: (sq(a) * (b.y - c.y) + sq(b) * (c.y - a.y) + sq(c) * (a.y - b.y)) / d,
    y: (sq(a) * (c.x - b.x) + sq(b) * (a.x - c.x) + sq(c) * (b.x - a.x)) / d,
  }
  const angle = (p: Point) => Math.atan2(p.y - centre.y, p.x - centre.x)
  const ccw = (from: number, to: number) => (((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const startAngle = angle(a)
  const toMid = ccw(startAngle, angle(b))
  const toEnd = ccw(startAngle, angle(c))
  // Counter-clockwise (in angle terms) when mid comes before end that way, else clockwise.
  const sweep = toMid <= toEnd ? toEnd : toEnd - 2 * Math.PI
  return { centre, radius: Math.hypot(a.x - centre.x, a.y - centre.y), startAngle, sweep }
}

/**
 * Chords for an arc of `radius` and `sweep` (radians) so that none deviates from it by more
 * than `tol`: `n = ceil(|sweep| / (2·acos(1 − tol/r)))`, at least 1.
 */
export function chordCount(radius: number, sweep: number, tol: number): number {
  const step = 2 * Math.acos(Math.max(-1, 1 - tol / radius))
  return Math.max(1, Math.ceil(Math.abs(sweep) / step))
}

/** The arc's points from start to end, `chordCount` equal chords (ends exactly as given). */
export function flattenArc(arc: ArcSegment, tol: number): Point[] {
  const { centre, radius, startAngle, sweep } = arcGeometry(arc)
  const n = chordCount(radius, sweep, tol)
  const points: Point[] = [arc.start]
  for (let i = 1; i < n; i++) {
    const t = startAngle + (sweep * i) / n
    points.push({ x: centre.x + radius * Math.cos(t), y: centre.y + radius * Math.sin(t) })
  }
  points.push(arc.end)
  return points
}

/** The segment reversed. */
const reversed = (s: Segment): Segment => (s.kind === 'circle' ? s : { ...s, start: s.end, end: s.start })

/**
 * The one flatten: the model's (or segments') closed loops as polylines, KiCad frame. Lines stay
 * as they are; each arc becomes `chordCount` equal chords, so no chord deviates more than `tol`.
 * Each loop lists its vertices once (the closing edge back to the first is implied).
 */
export function flatten(input: makerjs.IModel | readonly Segment[], tol: number): Point[][] {
  const segments = Array.isArray(input) ? (input as readonly Segment[]) : toSegments(input as makerjs.IModel)
  return chainLoops(segments).map((loop) => {
    const out: Point[] = []
    let tip: Point | undefined
    for (const raw of loop) {
      if (raw.kind === 'circle') throw new Error('flatten: circles are not supported')
      // chainLoops keeps each segment's own direction: orient it along the loop.
      const s =
        tip && Math.hypot(raw.end.x - tip.x, raw.end.y - tip.y) < Math.hypot(raw.start.x - tip.x, raw.start.y - tip.y)
          ? reversed(raw)
          : raw
      if (s.kind === 'circle') continue
      const points = s.kind === 'line' ? [s.start, s.end] : flattenArc(s, tol)
      // The previous segment's end is this one's start (within the chain tolerance).
      out.push(...(out.length === 0 ? points : points.slice(1)))
      tip = s.end
    }
    // The last point closes onto the first.
    if (out.length > 1) out.pop()
    return out
  })
}

/** Total vertex count of the loops. */
export const vertexCount = (loops: readonly Point[][]): number => loops.reduce((n, loop) => n + loop.length, 0)

function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Exact distance from `p` to an outline segment (line, or arc on its own sweep). */
export function distanceToSegment(p: Point, s: Segment): number {
  if (s.kind === 'line') return pointToSegment(p, s.start, s.end)
  if (s.kind === 'circle') return Math.abs(Math.hypot(p.x - s.centre.x, p.y - s.centre.y) - s.radius)
  const { centre, radius, startAngle, sweep } = arcGeometry(s)
  const off = Math.atan2(p.y - centre.y, p.x - centre.x) - startAngle
  const along = sweep >= 0 ? ((off % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) : ((-off % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  if (along <= Math.abs(sweep)) return Math.abs(Math.hypot(p.x - centre.x, p.y - centre.y) - radius)
  return Math.min(Math.hypot(p.x - s.start.x, p.y - s.start.y), Math.hypot(p.x - s.end.x, p.y - s.end.y))
}

/** Points along the segment no more than `step` apart, both ends included. */
function sampleSegment(s: Segment, step: number): Point[] {
  if (s.kind === 'line') return sampleEdge(s.start, s.end, step)
  if (s.kind === 'circle') throw new Error('sampleSegment: circles are not supported')
  const { centre, radius, startAngle, sweep } = arcGeometry(s)
  const n = Math.max(1, Math.ceil((Math.abs(sweep) * radius) / step))
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = startAngle + (sweep * i) / n
    return { x: centre.x + radius * Math.cos(t), y: centre.y + radius * Math.sin(t) }
  })
}

function sampleEdge(a: Point, b: Point, step: number): Point[] {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step))
  return Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }))
}

const edgesOf = (loops: readonly Point[][]): [Point, Point][] =>
  loops.flatMap((loop) => loop.map((p, i): [Point, Point] => [p, loop[(i + 1) % loop.length]!]))

export type FlattenedDeviation = {
  /** Max over samples of the polyline of the distance to the reference outline, mm. */
  polylineToReference: number
  /** Max over samples of the reference outline of the distance to the polyline, mm. */
  referenceToPolyline: number
  /** The larger of the two: a lower bound on the true symmetric (Hausdorff) distance. */
  deviation: number
  /**
   * An upper bound on the true value: `deviation + step / 2`. Samples are at most `step`
   * apart along each curve and distance is 1-Lipschitz, so no point between two samples is
   * further than half a step beyond the nearer sample's distance.
   */
  bound: number
  step: number
  /** Where the max was found. */
  worst: Point
}

/**
 * The symmetric max distance between the flattened polyline loops and the exact reference
 * outline, measured both ways along curves sampled every `step` mm (default 0.005).
 */
export function flattenedDeviation(
  reference: readonly Segment[],
  polyline: readonly Point[][],
  step = 0.005,
): FlattenedDeviation {
  const edges = edgesOf(polyline)
  let worst: Point = { x: NaN, y: NaN }
  let polylineToReference = 0
  for (const [a, b] of edges) {
    for (const p of sampleEdge(a, b, step)) {
      let d = Infinity
      for (const s of reference) d = Math.min(d, distanceToSegment(p, s))
      if (d > polylineToReference) {
        polylineToReference = d
        worst = p
      }
    }
  }
  let referenceToPolyline = 0
  for (const s of reference) {
    for (const p of sampleSegment(s, step)) {
      let d = Infinity
      for (const [a, b] of edges) d = Math.min(d, pointToSegment(p, a, b))
      if (d > referenceToPolyline) {
        referenceToPolyline = d
        if (d > polylineToReference) worst = p
      }
    }
  }
  const deviation = Math.max(polylineToReference, referenceToPolyline)
  return { polylineToReference, referenceToPolyline, deviation, bound: deviation + step / 2, step, worst }
}

/** The worst chord of any arc in `segments`: its sagitta (max distance from the arc), mm. */
export function worstChord(segments: readonly Segment[], tol: number): { arc: number; at: Point; sagitta: number } {
  let worst = { arc: -1, at: { x: NaN, y: NaN }, sagitta: 0 }
  for (const [index, s] of segments.entries()) {
    if (s.kind !== 'arc') continue
    const { centre, radius } = arcGeometry(s)
    const points = flattenArc(s, tol)
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!
      const b = points[i]!
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const sagitta = radius - Math.hypot(mid.x - centre.x, mid.y - centre.y)
      if (sagitta > worst.sagitta) worst = { arc: index, at: s.start, sagitta }
    }
  }
  return worst
}

/** Line pairs closer than this at a shared end, mm, and this close in direction, rad, are one line. */
export const COLLINEAR_DISTANCE = 1e-6
export const COLLINEAR_ANGLE = 1e-6

/**
 * Merges lines that continue each other: a shared end within `COLLINEAR_DISTANCE` and the same
 * direction within `COLLINEAR_ANGLE`. A makerjs union can split one outline edge where the other
 * shape's vertex lies on it; this undoes that split and nothing else (arcs are kept as given, and
 * no segment is dropped or invented). Returns the segments and the points where lines were joined.
 */
export function mergeCollinear(input: readonly Segment[]): { segments: Segment[]; joins: Point[] } {
  const segments = [...input]
  const joins: Point[] = []
  const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= COLLINEAR_DISTANCE
  const direction = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x)
  const sameDirection = (a: number, b: number) => {
    const d = Math.abs(a - b) % (2 * Math.PI)
    return Math.min(d, 2 * Math.PI - d) <= COLLINEAR_ANGLE
  }
  search: for (;;) {
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]!
      if (s.kind !== 'line') continue
      for (let j = i + 1; j < segments.length; j++) {
        const t = segments[j]!
        if (t.kind !== 'line') continue
        // Orient both so the first ends where the second starts.
        for (const [a, b] of [
          [s, t],
          [s, reversed(t)],
          [reversed(s), t],
          [reversed(s), reversed(t)],
        ] as const) {
          if (a.kind !== 'line' || b.kind !== 'line' || !near(a.end, b.start)) continue
          if (!sameDirection(direction(a.start, a.end), direction(b.start, b.end))) continue
          joins.push(a.end)
          segments[i] = { kind: 'line', start: a.start, end: b.end }
          segments.splice(j, 1)
          continue search
        }
      }
    }
    return { segments, joins }
  }
}
