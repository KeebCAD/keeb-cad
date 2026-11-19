import type { PolygonRegion } from '@keeb-cad/schema'
import { aPolygonRegion } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { packPolygonRegions, readPolygonRegions } from './polygon-regions-codec'

// An L whose arms are 18 wide, its corner square from (−9, −9) to (9, 9).
const L_SHAPE = aPolygonRegion({
  outer: [
    { x: -9, y: -9 },
    { x: 27, y: -9 },
    { x: 27, y: 9 },
    { x: 9, y: 9 },
    { x: 9, y: 27 },
    { x: -9, y: 27 },
  ],
})

const HOLED_SQUARE = aPolygonRegion({
  outer: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
  holes: [
    [
      { x: 4, y: 4 },
      { x: 4, y: 6 },
      { x: 6.25, y: 6 },
    ],
  ],
})

function roundTrip(rows: PolygonRegion[][]): PolygonRegion[][] {
  const columns = packPolygonRegions(rows)
  return rows.map((_regions, row) => readPolygonRegions(columns, row))
}

describe('the polygon regions codec', () => {
  it.each([
    ['no rows', []],
    ['a row with no regions', [[]]],
    ['two rows, one with two regions and a hole', [[L_SHAPE], [L_SHAPE, HOLED_SQUARE]]],
  ])('reads back %s as packed', (_role, rows: PolygonRegion[][]) => {
    expect(roundTrip(rows)).toEqual(rows)
  })

  it('packs rows with no regions into empty columns', () => {
    const { rowLoops, loopPoints, loopHole, points } = packPolygonRegions([[], []])

    expect({
      rowLoops: [...rowLoops],
      loopPoints: [...loopPoints],
      loopHole: [...loopHole],
      points: [...points],
    }).toEqual({ rowLoops: [0, 0, 0], loopPoints: [0], loopHole: [], points: [] })
  })

  it('packs no rows into one offset per offset column', () => {
    const { rowLoops, loopPoints } = packPolygonRegions([])

    expect({ rowLoops: [...rowLoops], loopPoints: [...loopPoints] }).toEqual({
      rowLoops: [0],
      loopPoints: [0],
    })
  })

  it('throws on a row whose first loop is a hole', () => {
    const columns = {
      rowLoops: Uint32Array.from([0, 1]),
      loopPoints: Uint32Array.from([0, 3]),
      loopHole: Uint8Array.from([1]),
      points: Float64Array.from([0, 0, 0, 1, 1, 1]),
    }

    expect(() => readPolygonRegions(columns, 0)).toThrow(RangeError)
  })
})
