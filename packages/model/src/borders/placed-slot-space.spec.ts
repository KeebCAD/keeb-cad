import { isWellFormed } from '@keeb-cad/geometry'
import { describe, expect, it } from 'vitest'

import { placedSlotSpace } from './placed-slot-space'

const DIGITS = 9

// An L whose arms are 18 wide, its corner square from (−9, −9) to (9, 9).
const L_SHAPE = [
  {
    outer: [
      { x: -9, y: -9 },
      { x: 27, y: -9 },
      { x: 27, y: 9 },
      { x: 9, y: 9 },
      { x: 9, y: 27 },
      { x: -9, y: 27 },
    ],
    holes: [],
  },
]

const HOLED_SQUARE = [
  {
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
        { x: 6, y: 6 },
        { x: 6, y: 4 },
      ],
    ],
  },
]

const near = (x: number, y: number) => ({
  x: expect.closeTo(x, DIGITS),
  y: expect.closeTo(y, DIGITS),
})

describe('placedSlotSpace', () => {
  it('turns an L by its frame and moves it there, keeping the order of its points', () => {
    expect(placedSlotSpace({ x: 5, y: 0, rot: 90, mirrored: false }, L_SHAPE)).toEqual([
      {
        outer: [near(14, -9), near(14, 27), near(-4, 27), near(-4, 9), near(-22, 9), near(-22, -9)],
        holes: [],
      },
    ])
  })

  it('reflects a mirrored L before its turn and reverses its points, so it stays counter-clockwise', () => {
    const placed = placedSlotSpace({ x: 5, y: 0, rot: 90, mirrored: true }, L_SHAPE)

    expect({ placed, wound: isWellFormed(placed) }).toEqual({
      wound: true,
      placed: [
        {
          outer: [
            near(-22, 9),
            near(-22, -9),
            near(-4, -9),
            near(-4, -27),
            near(14, -27),
            near(14, 9),
          ],
          holes: [],
        },
      ],
    })
  })

  it('reverses every loop of a mirrored square with a hole, so its hole stays clockwise', () => {
    const placed = placedSlotSpace({ x: 0, y: 0, rot: 0, mirrored: true }, HOLED_SQUARE)

    expect({ placed, wound: isWellFormed(placed) }).toEqual({
      wound: true,
      placed: [
        {
          outer: [near(0, 10), near(-10, 10), near(-10, 0), near(0, 0)],
          holes: [[near(-6, 4), near(-6, 6), near(-4, 6), near(-4, 4)]],
        },
      ],
    })
  })
})
