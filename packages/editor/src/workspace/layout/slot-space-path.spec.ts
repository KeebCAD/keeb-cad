import { describe, expect, it } from 'vitest'

import { slotSpacePath } from './slot-space-path'

// An L whose arms are 18 wide, its corner square from (−9, −9) to (9, 9).
const L_SHAPE = {
  outer: [
    { x: -9, y: -9 },
    { x: 27, y: -9 },
    { x: 27, y: 9 },
    { x: 9, y: 9 },
    { x: 9, y: 27 },
    { x: -9, y: 27 },
  ],
  holes: [],
}

const HOLED_SQUARE = {
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
}

describe('slotSpacePath', () => {
  it.each([
    ['an L', [L_SHAPE], 'M -9 -9 L 27 -9 L 27 9 L 9 9 L 9 27 L -9 27 Z'],
    [
      'a square with a hole',
      [HOLED_SQUARE],
      'M 0 0 L 10 0 L 10 10 L 0 10 Z M 4 4 L 4 6 L 6 6 L 6 4 Z',
    ],
    [
      'two regions',
      [HOLED_SQUARE, L_SHAPE],
      'M 0 0 L 10 0 L 10 10 L 0 10 Z M 4 4 L 4 6 L 6 6 L 6 4 Z M -9 -9 L 27 -9 L 27 9 L 9 9 L 9 27 L -9 27 Z',
    ],
  ])('draws %s as one closed subpath per loop, in order', (_role, slotSpace, expected) => {
    expect(slotSpacePath(slotSpace)).toBe(expected)
  })
})
