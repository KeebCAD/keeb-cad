import type { Point, PolygonRegion } from './types'

// Equal geometry gives equal arrays whatever order and winding the engine handed back.
export function normalisePolygonRegions(regions: readonly PolygonRegion[]): PolygonRegion[] {
  return regions
    .map(({ outer, holes }) => ({
      outer: normaliseLoop(outer, 'counter-clockwise'),
      holes: holes.map((hole) => normaliseLoop(hole, 'clockwise')).toSorted(byStart),
    }))
    .toSorted((a, b) => byStart(a.outer, b.outer))
}

function normaliseLoop(
  loop: readonly Point[],
  winding: 'counter-clockwise' | 'clockwise',
): Point[] {
  const counterClockwise = signedArea(loop) > 0
  const wound =
    counterClockwise === (winding === 'counter-clockwise') ? [...loop] : loop.toReversed()
  const start = lowestThenLeftmost(wound)
  return [...wound.slice(start), ...wound.slice(0, start)]
}

function signedArea(loop: readonly Point[]): number {
  let twice = 0
  for (const [index, { x, y }] of loop.entries()) {
    const next = loop[(index + 1) % loop.length] as Point
    twice += x * next.y - next.x * y
  }
  return twice / 2
}

function lowestThenLeftmost(loop: readonly Point[]): number {
  let lowest = 0
  for (const [index, point] of loop.entries()) {
    if (comparePoints(point, loop[lowest] as Point) < 0) lowest = index
  }
  return lowest
}

function byStart(a: readonly Point[], b: readonly Point[]): number {
  return comparePoints(a[0] as Point, b[0] as Point)
}

function comparePoints(a: Point, b: Point): number {
  return a.y - b.y || a.x - b.x
}
