import { Option } from '@keeb-cad/result'
import { describe, expect, it } from 'vitest'

import { FLATTEN_TOL } from './flatten-tolerance'
import { growAndUnite } from './grow-and-unite'
import { signedArea } from './signed-area'
import type { GrownRegions, Point, PolygonRegion } from './types'

const DIGITS = 6
const DISTANCE = 1
const SIDE = 10
// Precision 6 rounds every coordinate to 1e-6. Clipper spaces the arc's vertices so a chord
// strays by the whole arc tolerance, so that rounding can carry a chord's midpoint past it too.
const VERTEX_TOLERANCE = 1e-6

function square(x: number, y: number, distance = DISTANCE): GrownRegions {
  return {
    regions: [
      {
        outer: [
          { x, y },
          { x: x + SIDE, y },
          { x: x + SIDE, y: y + SIDE },
          { x, y: y + SIDE },
        ],
        holes: [],
      },
    ],
    distance,
  }
}

// The 10 × 10 square at the origin with a clockwise 2 × 2 hole at its centre.
const HOLED_SQUARE = {
  outer: [
    { x: 0, y: 0 },
    { x: SIDE, y: 0 },
    { x: SIDE, y: SIDE },
    { x: 0, y: SIDE },
  ],
  holes: [
    [
      { x: 4, y: 4 },
      { x: 4, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 4 },
    ],
  ],
}

// The 10 × 10 squares filling (0, 0)–(width, height) but those at the given corners.
function blockWithout(width: number, height: number, missing: readonly Point[]): GrownRegions[] {
  const corners = Array.from({ length: (width / SIDE) * (height / SIDE) }, (_, index) => ({
    x: (index % (width / SIDE)) * SIDE,
    y: Math.floor(index / (width / SIDE)) * SIDE,
  }))
  return corners
    .filter((corner) => missing.every(({ x, y }) => x !== corner.x || y !== corner.y))
    .map(({ x, y }) => square(x, y))
}

function bounds(loop: readonly Point[]) {
  const xs = loop.map(({ x }) => x)
  const ys = loop.map(({ y }) => y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

function closeBounds(minX: number, minY: number, maxX: number, maxY: number) {
  return {
    minX: expect.closeTo(minX, DIGITS),
    minY: expect.closeTo(minY, DIGITS),
    maxX: expect.closeTo(maxX, DIGITS),
    maxY: expect.closeTo(maxY, DIGITS),
  }
}

// From a point to the square (0, 0)–(10, 10), zero inside it.
function distanceToSquare({ x, y }: Point): number {
  const dx = Math.max(-x, 0, x - SIDE)
  const dy = Math.max(-y, 0, y - SIDE)
  return Math.hypot(dx, dy)
}

function regionsOf(grown: readonly GrownRegions[]): PolygonRegion[] {
  return growAndUnite(grown).getOr([])
}

describe('growAndUnite', () => {
  it('winds the outer loop of one grown square counter-clockwise', () => {
    const regions = regionsOf([square(0, 0)])

    expect(regions.map(({ outer, holes }) => ({ area: signedArea(outer) > 0, holes }))).toEqual([
      { area: true, holes: [] },
    ])
  })

  it('leaves a clockwise hole where a block of squares misses its centre', () => {
    const regions = regionsOf(blockWithout(30, 30, [{ x: 10, y: 10 }]))

    expect(
      regions.map(({ holes }) =>
        holes.map((hole) => ({ clockwise: signedArea(hole) < 0, bounds: bounds(hole) })),
      ),
    ).toEqual([[{ clockwise: true, bounds: closeBounds(11, 11, 19, 19) }]])
  })

  it('orders regions by their lowest-then-leftmost point and starts each loop there, once', () => {
    const regions = regionsOf([square(40, 0), square(0, 0)])

    expect(
      regions.map(({ outer }) => ({
        first: outer[0],
        repeatsFirst: outer.at(-1)?.x === outer[0]?.x && outer.at(-1)?.y === outer[0]?.y,
      })),
    ).toEqual([
      {
        first: { x: expect.closeTo(0, DIGITS), y: expect.closeTo(-1, DIGITS) },
        repeatsFirst: false,
      },
      {
        first: { x: expect.closeTo(40, DIGITS), y: expect.closeTo(-1, DIGITS) },
        repeatsFirst: false,
      },
    ])
  })

  it('orders the holes of a region by their lowest-then-leftmost point', () => {
    const regions = regionsOf(
      blockWithout(50, 30, [
        { x: 30, y: 10 },
        { x: 10, y: 10 },
      ]).toReversed(),
    )

    expect(regions.map(({ holes }) => holes.map(bounds))).toEqual([
      [closeBounds(11, 11, 19, 19), closeBounds(31, 11, 39, 19)],
    ])
  })

  it('puts every vertex of a grown square on the arc and keeps every chord within the flatten tolerance of it', () => {
    const [region] = regionsOf([square(0, 0)])
    const outer = region?.outer ?? []
    const midpoints = outer.map((point, index) => {
      const next = outer[(index + 1) % outer.length] as Point
      return { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }
    })

    const vertexError = Math.max(
      ...outer.map((point) => Math.abs(distanceToSquare(point) - DISTANCE)),
    )
    const nearestMidpoint = Math.min(...midpoints.map(distanceToSquare))

    expect({
      vertices: outer.length > 0,
      vertexWithinTolerance: vertexError <= VERTEX_TOLERANCE,
      chordsWithinTolerance: nearestMidpoint >= DISTANCE - FLATTEN_TOL - VERTEX_TOLERANCE,
    }).toEqual({ vertices: true, vertexWithinTolerance: true, chordsWithinTolerance: true })
  })

  it('keeps a region with a hole as it is at distance 0', () => {
    expect(growAndUnite([{ regions: [HOLED_SQUARE], distance: 0 }])).toEqual(
      Option.some([HOLED_SQUARE]),
    )
  })

  it('shrinks a hole by the distance its outer loop grows', () => {
    const regions = regionsOf([{ regions: [HOLED_SQUARE], distance: 0.5 }])

    expect(
      regions.map(({ outer, holes }) => ({ outer: bounds(outer), holes: holes.map(bounds) })),
    ).toEqual([
      { outer: closeBounds(-0.5, -0.5, 10.5, 10.5), holes: [closeBounds(4.5, 4.5, 5.5, 5.5)] },
    ])
  })

  it('gives no regions for nothing to grow', () => {
    expect(growAndUnite([])).toEqual(Option.some([]))
  })

  it('gives none for a region with a NaN coordinate', () => {
    const [region] = square(0, 0).regions as [PolygonRegion]
    const broken = {
      regions: [{ ...region, outer: [{ x: NaN, y: 0 }, ...region.outer.slice(1)] }],
      distance: DISTANCE,
    }

    expect(growAndUnite([broken])).toEqual(Option.none())
  })

  it.each([
    ["just inside clipper's range", 9e9, Option.some(1)],
    ["past clipper's range", 1e10, Option.none()],
  ])('grows a square %s at x %d into %o regions', (_role, x, expectedRegions) => {
    expect(growAndUnite([square(x, 0)]).map((regions) => regions.length)).toEqual(expectedRegions)
  })
})
