import { describe, expect, it } from 'vitest'

import { rotation, translation } from './affine'
import { frameOf } from './frame-of'

const DIGITS = 9

describe('frameOf', () => {
  it.each([
    ['just below the half turn', 179, 179],
    ['on the half turn', 180, 180],
    ['just above the half turn', 181, -179],
    ['just above the negative half turn', -179, -179],
    ['on the negative half turn', -180, 180],
    ['just below the negative half turn', -181, 179],
    ['past the half turn by 10', 190, -170],
  ])('reads a rotation %s into (−180, 180]', (_role, degrees, expectedRot) => {
    expect(frameOf(rotation(degrees))).toEqual({
      x: 0,
      y: 0,
      rot: expect.closeTo(expectedRot, DIGITS),
    })
  })

  it('reads the position of a translation', () => {
    expect(frameOf(translation(3, -4))).toEqual({ x: 3, y: -4, rot: 0 })
  })
})
