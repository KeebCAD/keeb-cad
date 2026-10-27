/*
 * Ported from kle-ng `src/utils/pcb-tracks/{distance,shapes}.ts`, commit
 * 0c762f6d69aee77627b44d2a4038095ea3c9855b (https://github.com/adamws/kle-ng).
 *
 * MIT License
 *
 * Copyright (c) 2025 adamws
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// Changes from kle-ng: world frame (pads carry world x/y/r from routing-input.ts) instead of
// switch-local; no drill offset (Corney has none); roundrect radius passed in; plus exact
// distances to Edge.Cuts arcs and circles (`edgeGap`), which kle-ng does not have.
//
// A shape is a core (point, segment or polygon) inflated by a radius:
// circle = point + r, track or oval = segment + r (capsule), rect = polygon + 0,
// roundrect = inset polygon + corner radius (exact). Gap = core distance minus both radii.
import type { Point, Segment } from '../../fixtures/src/kicad-pcb'

export type Vec = Point

export type Core =
  | { kind: 'point'; p: Vec }
  | { kind: 'segment'; a: Vec; b: Vec }
  /** Closed simple polygon, vertices in order. */
  | { kind: 'polygon'; pts: Vec[] }

export interface Shape {
  core: Core
  r: number
}

/** Distance with the closest points on each argument (equal when touching). */
export interface Closest {
  d: number
  a: Vec
  b: Vec
}

export const sub = (p: Vec, q: Vec): Vec => ({ x: p.x - q.x, y: p.y - q.y })
export const dot = (p: Vec, q: Vec) => p.x * q.x + p.y * q.y
export const cross = (p: Vec, q: Vec) => p.x * q.y - p.y * q.x
export const dist = (p: Vec, q: Vec) => Math.hypot(p.x - q.x, p.y - q.y)

const flip = (c: Closest): Closest => ({ d: c.d, a: c.b, b: c.a })

export function closestOnSegment(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a)
  const len2 = dot(ab, ab)
  if (len2 === 0) return { x: a.x, y: a.y }
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / len2))
  return { x: a.x + ab.x * t, y: a.y + ab.y * t }
}

export function pointSegment(p: Vec, a: Vec, b: Vec): Closest {
  const q = closestOnSegment(p, a, b)
  return { d: dist(p, q), a: p, b: q }
}

/** Intersection point of segments ab and cd, or null (collinear overlaps give an endpoint). */
export function segmentIntersection(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
  const r = sub(b, a)
  const s = sub(d, c)
  const denom = cross(r, s)
  const ca = sub(c, a)
  if (denom === 0) {
    if (cross(ca, r) !== 0) return null
    for (const [p, q0, q1] of [
      [c, a, b],
      [d, a, b],
      [a, c, d],
      [b, c, d],
    ] as const) {
      if (pointSegment(p, q0, q1).d === 0) return { x: p.x, y: p.y }
    }
    return null
  }
  const t = cross(ca, s) / denom
  const u = cross(ca, r) / denom
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { x: a.x + r.x * t, y: a.y + r.y * t }
}

export function segmentSegment(a: Vec, b: Vec, c: Vec, d: Vec): Closest {
  const hit = segmentIntersection(a, b, c, d)
  if (hit) return { d: 0, a: hit, b: hit }
  let best = pointSegment(a, c, d)
  for (const cand of [pointSegment(b, c, d), flip(pointSegment(c, a, b)), flip(pointSegment(d, a, b))]) {
    if (cand.d < best.d) best = cand
  }
  return best
}

/** Even-odd point in polygon test (boundary counts as inside). */
export function pointInPolygon(p: Vec, pts: readonly Vec[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!
    const b = pts[j]!
    if (pointSegment(p, a, b).d === 0) return true
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function edges(pts: readonly Vec[]): [Vec, Vec][] {
  return pts.map((p, i) => [p, pts[(i + 1) % pts.length]!])
}

export function pointPolygon(p: Vec, pts: readonly Vec[]): Closest {
  if (pointInPolygon(p, pts)) return { d: 0, a: p, b: p }
  let best: Closest | undefined
  for (const [a, b] of edges(pts)) {
    const c = pointSegment(p, a, b)
    if (!best || c.d < best.d) best = c
  }
  return best!
}

export function segmentPolygon(a: Vec, b: Vec, pts: readonly Vec[]): Closest {
  if (pointInPolygon(a, pts)) return { d: 0, a, b: a }
  if (pointInPolygon(b, pts)) return { d: 0, a: b, b }
  let best: Closest | undefined
  for (const [c, d] of edges(pts)) {
    const cand = segmentSegment(a, b, c, d)
    if (!best || cand.d < best.d) best = cand
    if (best.d === 0) break
  }
  return best!
}

export function polygonPolygon(p: readonly Vec[], q: readonly Vec[]): Closest {
  if (q.length > 0 && pointInPolygon(q[0]!, p)) return { d: 0, a: q[0]!, b: q[0]! }
  if (p.length > 0 && pointInPolygon(p[0]!, q)) return { d: 0, a: p[0]!, b: p[0]! }
  let best: Closest | undefined
  for (const [a, b] of edges(p)) {
    const cand = segmentPolygon(a, b, q)
    if (!best || cand.d < best.d) best = cand
    if (best.d === 0) break
  }
  return best!
}

export function coreDistance(s: Core, t: Core): Closest {
  if (s.kind === 'point') {
    if (t.kind === 'point') return { d: dist(s.p, t.p), a: s.p, b: t.p }
    if (t.kind === 'segment') return pointSegment(s.p, t.a, t.b)
    return pointPolygon(s.p, t.pts)
  }
  if (s.kind === 'segment') {
    if (t.kind === 'point') return flip(pointSegment(t.p, s.a, s.b))
    if (t.kind === 'segment') return segmentSegment(s.a, s.b, t.a, t.b)
    return segmentPolygon(s.a, s.b, t.pts)
  }
  if (t.kind === 'point') return flip(pointPolygon(t.p, s.pts))
  if (t.kind === 'segment') return flip(segmentPolygon(t.a, t.b, s.pts))
  return polygonPolygon(s.pts, t.pts)
}

/** Gap between two shapes (0 when touching or overlapping), with the closest outline points. */
export function shapeGap(s: Shape, t: Shape): Closest {
  const c = coreDistance(s.core, t.core)
  const gap = Math.max(0, c.d - s.r - t.r)
  if (c.d === 0) return { d: 0, a: c.a, b: c.b }
  const towards = (from: Vec, to: Vec, len: number): Vec => ({
    x: from.x + ((to.x - from.x) * len) / c.d,
    y: from.y + ((to.y - from.y) * len) / c.d,
  })
  return { d: gap, a: towards(c.a, c.b, Math.min(s.r, c.d)), b: towards(c.b, c.a, Math.min(t.r, c.d)) }
}

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Bounds of a shape, its radius included. */
export function shapeBounds(s: Shape): Box {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  const add = (p: Vec) => {
    box.minX = Math.min(box.minX, p.x - s.r)
    box.minY = Math.min(box.minY, p.y - s.r)
    box.maxX = Math.max(box.maxX, p.x + s.r)
    box.maxY = Math.max(box.maxY, p.y + s.r)
  }
  const core = s.core
  if (core.kind === 'point') add(core.p)
  else if (core.kind === 'segment') {
    add(core.a)
    add(core.b)
  } else core.pts.forEach(add)
  return box
}

// --- Pads, tracks and vias (kle-ng shapes.ts), world frame ---------------------------------

/** The geometry a pad shape needs: world centre, world rotation (degrees), unrotated size. */
export interface PadLike {
  shape: string
  x: number
  y: number
  r: number
  size: { w: number; h: number }
  roundrectRatio?: number
  chamfer?: { ratio: number; corners: string[] }
}

/** Pad-frame point to world, with the rotation of kicad-pcb.ts's `readPads`. */
function padToWorld(pad: PadLike, p: Vec): Vec {
  const t = (pad.r * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  return { x: pad.x + p.x * c + p.y * s, y: pad.y - p.x * s + p.y * c }
}

function rectShape(pad: PadLike, w: number, h: number, r: number): Shape {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  const hw = w / 2 - rr
  const hh = h / 2 - rr
  if (hw === 0 && hh === 0) return { core: { kind: 'point', p: padToWorld(pad, { x: 0, y: 0 }) }, r: rr }
  if (hw === 0 || hh === 0) {
    const a = hw === 0 ? { x: 0, y: -hh } : { x: -hw, y: 0 }
    const b = hw === 0 ? { x: 0, y: hh } : { x: hw, y: 0 }
    return { core: { kind: 'segment', a: padToWorld(pad, a), b: padToWorld(pad, b) }, r: rr }
  }
  const pts = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map((p) => padToWorld(pad, p))
  return { core: { kind: 'polygon', pts }, r: rr }
}

/** A rect with KiCad chamfers: each named corner cut by `ratio` × the shorter side (new here). */
function chamferedRect(pad: PadLike, chamfer: { ratio: number; corners: string[] }): Shape {
  const hw = pad.size.w / 2
  const hh = pad.size.h / 2
  const c = Math.min(chamfer.ratio, 0.5) * Math.min(pad.size.w, pad.size.h)
  // Corners in order round the pad frame (y down), each with the two directions along its sides.
  const corners: Array<[string, Vec, Vec, Vec]> = [
    ['top_left', { x: -hw, y: -hh }, { x: 0, y: 1 }, { x: 1, y: 0 }],
    ['top_right', { x: hw, y: -hh }, { x: -1, y: 0 }, { x: 0, y: 1 }],
    ['bottom_right', { x: hw, y: hh }, { x: 0, y: -1 }, { x: -1, y: 0 }],
    ['bottom_left', { x: -hw, y: hh }, { x: 1, y: 0 }, { x: 0, y: -1 }],
  ]
  const pts = corners.flatMap(([name, p, inDir, outDir]) =>
    chamfer.corners.includes(name)
      ? [
          { x: p.x + inDir.x * c, y: p.y + inDir.y * c },
          { x: p.x + outDir.x * c, y: p.y + outDir.y * c },
        ]
      : [p],
  )
  return { core: { kind: 'polygon', pts: pts.map((p) => padToWorld(pad, p)) }, r: 0 }
}

/**
 * Copper shape of a pad. The roundrect ratio is KiCad's `roundrect_rratio` (corner radius over
 * the shorter side), from the pad unless given. Chamfers are cut from rects and from roundrects
 * with ratio 0; a rounded roundrect keeps its full shape, which contains the chamfered one.
 * Unknown shapes throw rather than guess.
 */
export function padShape(pad: PadLike, roundrectRatio = pad.roundrectRatio ?? 0): Shape {
  const { w, h } = pad.size
  const square = pad.shape === 'rect' || (pad.shape === 'roundrect' && roundrectRatio === 0)
  if (square && pad.chamfer) return chamferedRect(pad, pad.chamfer)
  switch (pad.shape) {
    case 'circle':
      return { core: { kind: 'point', p: padToWorld(pad, { x: 0, y: 0 }) }, r: w / 2 }
    case 'oval':
      return rectShape(pad, w, h, Math.min(w, h) / 2)
    case 'roundrect':
      return rectShape(pad, w, h, roundrectRatio * Math.min(w, h))
    case 'rect':
      return rectShape(pad, w, h, 0)
    default:
      throw new Error(`Unsupported pad shape: ${pad.shape}`)
  }
}

export function traceShape(a: Vec, b: Vec, width: number): Shape {
  return { core: { kind: 'segment', a, b }, r: width / 2 }
}

export function viaShape(at: Vec, diameter: number): Shape {
  return { core: { kind: 'point', p: at }, r: diameter / 2 }
}

// --- Board edge (new here) -----------------------------------------------------------------

/** A circle or an arc of it, angles in radians from atan2 in the file's frame. */
interface Ring {
  c: Vec
  R: number
  /** Start angle and signed sweep; a full circle has |sweep| = 2π. */
  start: number
  sweep: number
}

const TAU = 2 * Math.PI

function ringOf(s: Exclude<Segment, { kind: 'line' }>): Ring {
  if (s.kind === 'circle') return { c: s.centre, R: s.radius, start: 0, sweep: TAU }
  const { start: p, mid: q, end: e } = s
  const d = 2 * (p.x * (q.y - e.y) + q.x * (e.y - p.y) + e.x * (p.y - q.y))
  if (d === 0) throw new Error('Degenerate Edge.Cuts arc (collinear points)')
  const n = (v: Vec) => v.x * v.x + v.y * v.y
  const c = {
    x: (n(p) * (q.y - e.y) + n(q) * (e.y - p.y) + n(e) * (p.y - q.y)) / d,
    y: (n(p) * (e.x - q.x) + n(q) * (p.x - e.x) + n(e) * (q.x - p.x)) / d,
  }
  const ang = (v: Vec) => Math.atan2(v.y - c.y, v.x - c.x)
  const a0 = ang(p)
  const ccw = (x: number) => (((x - a0) % TAU) + TAU) % TAU
  const toMid = ccw(ang(q))
  const toEnd = ccw(ang(e))
  // Sweep from start through mid to end, in whichever direction passes the mid.
  const sweep = toMid <= toEnd ? toEnd : toEnd - TAU
  return { c, R: dist(c, p), start: a0, sweep }
}

function inSweep(ring: Ring, p: Vec): boolean {
  if (Math.abs(ring.sweep) >= TAU) return true
  const off = Math.atan2(p.y - ring.c.y, p.x - ring.c.x) - ring.start
  const ccw = ((off % TAU) + TAU) % TAU
  const eps = 1e-12
  return ring.sweep >= 0 ? ccw <= ring.sweep + eps : TAU - ccw <= -ring.sweep + eps || ccw <= eps
}

const ringPoint = (ring: Ring, a: number): Vec => ({
  x: ring.c.x + ring.R * Math.cos(a),
  y: ring.c.y + ring.R * Math.sin(a),
})

/** Exact distance from segment ab (a point when a = b) to a ring arc. */
function segmentRing(a: Vec, b: Vec, ring: Ring): Closest {
  const ends =
    Math.abs(ring.sweep) >= TAU ? [] : [ringPoint(ring, ring.start), ringPoint(ring, ring.start + ring.sweep)]
  let best: Closest | undefined
  const consider = (c: Closest) => {
    if (!best || c.d < best.d) best = c
  }
  for (const e of ends) consider(flip(pointSegment(e, a, b)))
  // Interior minima of |d(t) − R| along the segment: ends, the foot of the centre, the circle
  // crossings and the crossings of the arc's end rays. Each counts only where it is in the sweep.
  const ab = sub(b, a)
  const len2 = dot(ab, ab)
  const ts = [0, 1]
  if (len2 > 0) {
    const ac = sub(a, ring.c)
    ts.push(-dot(ac, ab) / len2)
    const qa = len2
    const qb = 2 * dot(ac, ab)
    const qc = dot(ac, ac) - ring.R * ring.R
    const disc = qb * qb - 4 * qa * qc
    if (disc >= 0) ts.push((-qb - Math.sqrt(disc)) / (2 * qa), (-qb + Math.sqrt(disc)) / (2 * qa))
    for (const e of ends) {
      const dir = sub(e, ring.c)
      const den = cross(ab, dir)
      if (den !== 0) ts.push(cross(sub(ring.c, a), dir) / den)
    }
  }
  for (const t of ts) {
    if (t < 0 || t > 1) continue
    const p = { x: a.x + ab.x * t, y: a.y + ab.y * t }
    if (!inSweep(ring, p)) continue
    const d = dist(p, ring.c)
    const q = d === 0 ? ringPoint(ring, ring.start) : { x: ring.c.x + ((p.x - ring.c.x) * ring.R) / d, y: ring.c.y + ((p.y - ring.c.y) * ring.R) / d }
    consider({ d: Math.abs(d - ring.R), a: p, b: q })
  }
  return best!
}

/** Core distance from a segment or point core to one Edge.Cuts graphic. */
function segmentEdge(a: Vec, b: Vec, edge: Segment): Closest {
  return edge.kind === 'line' ? segmentSegment(a, b, edge.start, edge.end) : segmentRing(a, b, ringOf(edge))
}

/** Gap from a copper shape (trace, via or pad) to one Edge.Cuts graphic. */
export function edgeGap(s: Shape, edge: Segment): Closest {
  const core = s.core
  let c: Closest
  if (core.kind === 'point') c = segmentEdge(core.p, core.p, edge)
  else if (core.kind === 'segment') c = segmentEdge(core.a, core.b, edge)
  else {
    // A polygon: the edge graphic is inside it (distance 0), or nearest to one of its sides.
    const on = edge.kind === 'line' ? edge.start : edge.kind === 'arc' ? edge.start : ringPoint(ringOf(edge), 0)
    if (pointInPolygon(on, core.pts)) c = { d: 0, a: on, b: on }
    else {
      c = edges(core.pts)
        .map(([a, b]) => segmentEdge(a, b, edge))
        .reduce((best, x) => (x.d < best.d ? x : best))
    }
  }
  return { d: Math.max(0, c.d - s.r), a: c.a, b: c.b }
}

/** Bounds of an Edge.Cuts graphic (arcs by their whole circle: loose but safe). */
export function edgeBounds(edge: Segment): Box {
  if (edge.kind === 'line') {
    return {
      minX: Math.min(edge.start.x, edge.end.x),
      minY: Math.min(edge.start.y, edge.end.y),
      maxX: Math.max(edge.start.x, edge.end.x),
      maxY: Math.max(edge.start.y, edge.end.y),
    }
  }
  const { c, R } = ringOf(edge)
  return { minX: c.x - R, minY: c.y - R, maxX: c.x + R, maxY: c.y + R }
}

/** Points along an Edge.Cuts graphic, for inside tests only (arcs every ≤ 5°). */
export function edgePolyline(edge: Segment): Vec[] {
  if (edge.kind === 'line') return [edge.start, edge.end]
  const ring = ringOf(edge)
  const n = Math.max(2, Math.ceil(Math.abs(ring.sweep) / (Math.PI / 36)))
  return Array.from({ length: n + 1 }, (_, i) => ringPoint(ring, ring.start + (ring.sweep * i) / n))
}

/**
 * An Edge.Cuts graphic as a polyline whose chords stay within `maxDeviation` of the true arc
 * (sagitta R(1 − cos(θ/2)) ≤ maxDeviation). Lines come back as their two ends; a circle closes on
 * its first point.
 */
export function flattenEdge(edge: Segment, maxDeviation: number): Vec[] {
  if (edge.kind === 'line') return [edge.start, edge.end]
  const ring = ringOf(edge)
  const step = ring.R <= maxDeviation ? Math.PI / 2 : 2 * Math.acos(1 - maxDeviation / ring.R)
  const n = Math.max(1, Math.ceil(Math.abs(ring.sweep) / step))
  const pts = Array.from({ length: n + 1 }, (_, i) => ringPoint(ring, ring.start + (ring.sweep * i) / n))
  // Arcs keep their exact file ends, so the chain closes on the next graphic's start.
  if (edge.kind === 'arc') {
    pts[0] = edge.start
    pts[n] = edge.end
  }
  return pts
}
