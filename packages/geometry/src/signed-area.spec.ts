import { describe, expect, it } from 'vitest'

import { signedArea } from './signed-area'

describe('signedArea', () => {
  it.each([
    [
      'a counter-clockwise unit square',
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      1,
    ],
    [
      'a clockwise unit square',
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
      ],
      -1,
    ],
    [
      '3 collinear points',
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
      0,
    ],
  ])('of %s', (_role, loop, expected) => {
    expect(signedArea(loop)).toBe(expected)
  })
})
