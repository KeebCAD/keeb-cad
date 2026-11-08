// Data-to-data comparisons of board geometry read by `kicad-pcb.ts`: outline segments and
// plate cutouts matched geometrically, footprints matched by reference. Every item's deviation
// is reported; failures, missing, extra and duplicate items are named.
//
// Frame: KiCad's (mm, y down, rotation in degrees). Callers convert (Ergogen: `(x, −y)`).
import type { ArcSegment, Footprint, LineSegment, Point, Segment } from './kicad-pcb'

/** Max deviation per item, mm, inclusive. */
export const PCB_TOLERANCE = 0.05

/** Endpoints closer than this, mm, are the same vertex when chaining loops. */
export const CHAIN_TOLERANCE = 1e-3

// Absorbs float noise so a deviation of exactly the tolerance passes (inclusive).
const EPSILON = 1e-9

export type ItemDeviation = {
  name: string
  /** mm; `Infinity` when the item cannot be compared at all. */
  deviation: number
  pass: boolean
  /** Extra facts behind the deviation, for the report. */
  detail?: string
}

export type ItemComparison = {
  pass: boolean
  /** What was compared, e.g. `outline segments`. */
  subject: string
  tolerance: number
  /** One entry per matched reference item, in reference order. */
  items: ItemDeviation[]
  /** Reference items the candidate lacks. */
  missing: string[]
  /** Candidate items no reference item matched. */
  extra: string[]
  /** Candidate items given more than once (same reference, or the same geometry). */
  duplicate: string[]
}

/** A plate cutout: a closed loop of Edge.Cuts segments, named after the key or point it serves. */
export type Cutout = { name: string; centre: Point; segments: Segment[] }

/** A candidate cutout: a closed loop; its name, when given, is only used in reports. */
export type CandidateCutout = { name?: string; segments: readonly Segment[] }

/** A candidate footprint. Reach and library are optional: rotation uses the reference's reach. */
export type CandidateFootprint = Pick<Footprint, 'reference' | 'side' | 'x' | 'y' | 'r'> &
  Partial<Footprint>

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const fmt = (n: number) => n.toFixed(3)
const mm = (n: number) => (Number.isFinite(n) ? `${n.toFixed(4)} mm` : 'no match')
const at = (p: Point) => `(${fmt(p.x)}, ${fmt(p.y)})`

/** A segment's first defining point: line/arc start, circle centre. */
export function anchorOf(segment: Segment): Point {
  return segment.kind === 'circle' ? segment.centre : segment.start
}

/**
 * Max distance over the defining points (circle: centre and |Δradius|), direction-insensitive.
 * Segments of different kinds never match: `Infinity`.
 */
export function segmentDeviation(a: Segment, b: Segment): number {
  if (a.kind === 'circle' && b.kind === 'circle') {
    return Math.max(distance(a.centre, b.centre), Math.abs(a.radius - b.radius))
  }
  if (a.kind === 'line' && b.kind === 'line') {
    return Math.min(
      Math.max(distance(a.start, b.start), distance(a.end, b.end)),
      Math.max(distance(a.start, b.end), distance(a.end, b.start)),
    )
  }
  if (a.kind === 'arc' && b.kind === 'arc') {
    const mid = distance(a.mid, b.mid)
    return Math.min(
      Math.max(distance(a.start, b.start), mid, distance(a.end, b.end)),
      Math.max(distance(a.start, b.end), mid, distance(a.end, b.start)),
    )
  }
  return Infinity
}

/**
 * Chains segments into closed loops (a circle is a loop of its own). At each vertex the
 * nearest unused endpoint continues the chain; a line or arc never closes on itself, so a
 * degenerate one (shorter than the tolerance) joins its neighbours. Segments keep their
 * original direction. Throws on a chain that does not close.
 */
export function chainLoops(
  segments: readonly Segment[],
  tolerance: number = CHAIN_TOLERANCE,
): Segment[][] {
  const loops: Segment[][] = []
  const open: (LineSegment | ArcSegment)[] = []
  for (const segment of segments) {
    if (segment.kind === 'circle') loops.push([segment])
    else open.push(segment)
  }

  for (let first = open.shift(); first; first = open.shift()) {
    const loop: Segment[] = [first]
    const origin = first.start
    let tip = first.end
    while (loop.length === 1 || distance(tip, origin) > tolerance) {
      let best = { index: -1, gap: Infinity, reversed: false }
      for (const [index, s] of open.entries()) {
        const forward = distance(s.start, tip)
        const backward = distance(s.end, tip)
        const gap = Math.min(forward, backward)
        if (gap < best.gap) best = { index, gap, reversed: backward < forward }
      }
      if (best.gap > tolerance) {
        throw new Error(
          `Open chain: no segment continues from ${at(tip)} ` +
            `(chain of ${loop.length} from ${at(origin)})`,
        )
      }
      const [next] = open.splice(best.index, 1)
      if (!next) break
      tip = best.reversed ? next.start : next.end
      loop.push(next)
    }
    loops.push(loop)
  }
  return loops
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

/** Bounds of the loop's defining points (circle: centre ± radius). */
export function boundsOf(segments: readonly Segment[]): Bounds {
  const points = segments.flatMap((s) => {
    if (s.kind === 'circle') {
      const { x, y } = s.centre
      return [
        { x: x - s.radius, y: y - s.radius },
        { x: x + s.radius, y: y + s.radius },
      ]
    }
    return s.kind === 'arc' ? [s.start, s.mid, s.end] : [s.start, s.end]
  })
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  }
}

/** The centre of a loop's bounds. */
export function centreOf(segments: readonly Segment[]): Point {
  const b = boundsOf(segments)
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
}

/**
 * Cutout deviation: `Infinity` unless both loops have as many segments, else the max over
 * `a`'s segments of the deviation to the nearest segment of `b`.
 */
export function loopDeviation(a: readonly Segment[], b: readonly Segment[]): number {
  return a.length === b.length
    ? Math.max(0, ...a.map((s) => Math.min(...b.map((t) => segmentDeviation(s, t)))))
    : Infinity
}

type GeometricMatch = {
  /** Reference index → candidate index, for matched references. */
  pairs: Map<number, { candidate: number; deviation: number }>
  /** Candidates excluded as duplicates of an earlier candidate. */
  duplicates: number[]
  unmatched: number[]
}

/**
 * Pairs each reference item with a distinct candidate, closest pairs first (only finite
 * deviations pair). Candidates that coincide with an earlier one are duplicates.
 */
function matchGeometric<R, C>(
  reference: readonly R[],
  candidate: readonly C[],
  deviation: (r: R | C, c: C) => number,
): GeometricMatch {
  const duplicates: number[] = []
  const live: number[] = []
  for (const [j, c] of candidate.entries()) {
    if (live.some((k) => deviation(candidate[k]!, c) <= EPSILON)) duplicates.push(j)
    else live.push(j)
  }

  const options: { ref: number; candidate: number; deviation: number }[] = []
  for (const [i, r] of reference.entries()) {
    for (const j of live) {
      const d = deviation(r, candidate[j]!)
      if (Number.isFinite(d)) options.push({ ref: i, candidate: j, deviation: d })
    }
  }
  options.sort((a, b) => a.deviation - b.deviation || a.ref - b.ref || a.candidate - b.candidate)

  const pairs = new Map<number, { candidate: number; deviation: number }>()
  const taken = new Set<number>()
  for (const option of options) {
    if (pairs.has(option.ref) || taken.has(option.candidate)) continue
    pairs.set(option.ref, { candidate: option.candidate, deviation: option.deviation })
    taken.add(option.candidate)
  }
  return { pairs, duplicates, unmatched: live.filter((j) => !taken.has(j)) }
}

function geometricComparison<R, C>(
  subject: string,
  reference: readonly R[],
  candidate: readonly C[],
  tolerance: number,
  deviation: (r: R | C, c: C) => number,
  referenceName: (r: R, index: number) => string,
  candidateName: (c: C, index: number) => string,
): ItemComparison {
  const { pairs, duplicates, unmatched } = matchGeometric(reference, candidate, deviation)
  const items: ItemDeviation[] = []
  const missing: string[] = []
  for (const [i, r] of reference.entries()) {
    const pair = pairs.get(i)
    if (pair) {
      items.push({
        name: referenceName(r, i),
        deviation: pair.deviation,
        pass: pair.deviation <= tolerance + EPSILON,
      })
    } else {
      missing.push(referenceName(r, i))
    }
  }
  const extra = unmatched.map((j) => candidateName(candidate[j]!, j))
  const duplicate = duplicates.map((j) => candidateName(candidate[j]!, j))
  return {
    pass:
      items.every((item) => item.pass) &&
      missing.length === 0 &&
      extra.length === 0 &&
      duplicate.length === 0,
    subject,
    tolerance,
    items,
    missing,
    extra,
    duplicate,
  }
}

/** Names segments `<label> <kind> #<n> at (x, y)`, n counting per kind from 1 in list order. */
function segmentNames(segments: readonly Segment[], label: string): string[] {
  const counts = new Map<string, number>()
  return segments.map((s) => {
    const n = (counts.get(s.kind) ?? 0) + 1
    counts.set(s.kind, n)
    return `${label} ${s.kind} #${n} at ${at(anchorOf(s))}`
  })
}

/**
 * Compares candidate segments against reference ones, matched geometrically (nearest same-kind
 * candidate, each used once), so the candidate may order and orient them freely.
 */
export function compareSegments(
  reference: readonly Segment[],
  candidate: readonly Segment[],
  { tolerance = PCB_TOLERANCE, label = 'outline' }: { tolerance?: number; label?: string } = {},
): ItemComparison {
  const referenceNames = segmentNames(reference, label)
  const candidateNames = segmentNames(candidate, 'candidate')
  return geometricComparison(
    `${label} segments`,
    reference,
    candidate,
    tolerance,
    segmentDeviation,
    (_, i) => referenceNames[i]!,
    (_, j) => candidateNames[j]!,
  )
}

/** Compares candidate cutouts against reference ones, matched geometrically, named by reference. */
export function compareCutouts(
  reference: readonly Cutout[],
  candidate: readonly CandidateCutout[],
  { tolerance = PCB_TOLERANCE }: { tolerance?: number } = {},
): ItemComparison {
  return geometricComparison(
    'cutouts',
    reference,
    candidate,
    tolerance,
    (r, c) => loopDeviation(r.segments, c.segments),
    (r) => r.name,
    (c) => c.name ?? `candidate cutout at ${at(centreOf(c.segments))}`,
  )
}

/** candidate − reference, wrapped to (−180, 180]. */
function rotationDelta(reference: number, candidate: number): number {
  const d = (((candidate - reference) % 360) + 360) % 360
  return d > 180 ? d - 360 : d
}

/**
 * Compares footprints by reference. Position is the centre distance; rotation is
 * |Δr| (rad) × the reference's reach; the side must match.
 */
export function compareFootprints(
  reference: readonly Footprint[],
  candidate: readonly CandidateFootprint[],
  { tolerance = PCB_TOLERANCE }: { tolerance?: number } = {},
): ItemComparison {
  const byReference = new Map<string, CandidateFootprint>()
  const duplicate = new Set<string>()
  for (const fp of candidate) {
    if (byReference.has(fp.reference)) duplicate.add(fp.reference)
    else byReference.set(fp.reference, fp)
  }
  const referenceNames = new Set(reference.map((fp) => fp.reference))

  const items: ItemDeviation[] = []
  const missing: string[] = []
  for (const ref of reference) {
    const cand = byReference.get(ref.reference)
    if (!cand) {
      missing.push(ref.reference)
      continue
    }
    const position = Math.hypot(cand.x - ref.x, cand.y - ref.y)
    const rotationDeg = rotationDelta(ref.r, cand.r)
    const rotation = Math.abs((rotationDeg * Math.PI) / 180) * ref.reach
    const sideOk = cand.side === ref.side
    items.push({
      name: ref.reference,
      deviation: Math.max(position, rotation),
      pass: sideOk && position <= tolerance + EPSILON && rotation <= tolerance + EPSILON,
      detail:
        `position ${mm(position)}, rotation ${rotationDeg.toFixed(4)}° × reach ` +
        `${mm(ref.reach)} = ${mm(rotation)}, ` +
        (sideOk ? `side ${ref.side}` : `side ${cand.side} ≠ ${ref.side}`),
    })
  }
  const extra = [...byReference.keys()].filter((name) => !referenceNames.has(name))

  return {
    pass:
      items.every((item) => item.pass) &&
      missing.length === 0 &&
      extra.length === 0 &&
      duplicate.size === 0,
    subject: 'footprints',
    tolerance,
    items,
    missing,
    extra,
    duplicate: [...duplicate],
  }
}

/** Every item's deviation, then every failing, missing, extra and duplicate item by name. */
export function formatItemComparison(result: ItemComparison): string {
  const failing = result.items.filter((item) => !item.pass)
  const lines = [
    `${result.pass ? 'PASS' : 'FAIL'}: ${result.items.length} ${result.subject} compared ` +
      `(deviation ≤ ${mm(result.tolerance)})`,
    ...result.items.map(
      (item) =>
        `  ${item.pass ? 'ok  ' : 'FAIL'} ${item.name}: ${mm(item.deviation)}` +
        (item.detail ? ` (${item.detail})` : ''),
    ),
  ]
  if (failing.length > 0) lines.push(`failing: ${failing.map((i) => i.name).join(', ')}`)
  if (result.missing.length > 0) lines.push(`missing: ${result.missing.join(', ')}`)
  if (result.extra.length > 0) lines.push(`extra: ${result.extra.join(', ')}`)
  if (result.duplicate.length > 0) lines.push(`duplicate: ${result.duplicate.join(', ')}`)
  return lines.join('\n')
}
