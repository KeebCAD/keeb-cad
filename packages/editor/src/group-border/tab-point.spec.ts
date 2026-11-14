import { Option } from '@keeb-cad/result'
import { aBorder, aBorderRegion } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { tabPoint } from './tab-point'

function outerOf(...outer: { x: number; y: number }[]) {
  return aBorder([aBorderRegion({ outer })])
}

describe('tabPoint', () => {
  it.each([
    [
      'keeps the top when a point lies just below it',
      outerOf({ x: 0, y: 5 }, { x: 3, y: 5 }, { x: -1, y: 4.999999 }),
      { x: 0, y: 5 },
    ],
    [
      'takes the leftmost of points on the top',
      outerOf({ x: 2, y: 5 }, { x: 0, y: 5 }),
      { x: 0, y: 5 },
    ],
    [
      'takes a point just above the top as the new top',
      outerOf({ x: 0, y: 5 }, { x: 4, y: 5.000001 }),
      { x: 4, y: 5.000001 },
    ],
  ])('%s', (_role, border, expected) => {
    expect(tabPoint(border)).toEqual(Option.some(expected))
  })

  it("takes the second region's top when it is higher than the first's", () => {
    const border = aBorder([
      aBorderRegion({ outer: [{ x: 0, y: 5 }] }),
      aBorderRegion({ outer: [{ x: 10, y: 8 }] }),
    ])

    expect(tabPoint(border)).toEqual(Option.some({ x: 10, y: 8 }))
  })

  it('gives no point for an empty border', () => {
    expect(tabPoint(aBorder([]))).toEqual(Option.none())
  })
})
