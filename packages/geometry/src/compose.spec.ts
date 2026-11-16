import { describe, expect, it } from 'vitest'

import { rotation, translation } from './affine'
import { compose } from './compose'
import { frameOf } from './frame-of'

const DIGITS = 9

describe('compose', () => {
  it('maps through the second matrix, then the first', () => {
    const turnedThenMoved = compose(translation(10, 0), rotation(90))
    const movedThenTurned = compose(rotation(90), translation(10, 0))

    expect([frameOf(turnedThenMoved), frameOf(movedThenTurned)]).toEqual([
      { x: 10, y: 0, rot: expect.closeTo(90, DIGITS) },
      {
        x: expect.closeTo(0, DIGITS),
        y: expect.closeTo(10, DIGITS),
        rot: expect.closeTo(90, DIGITS),
      },
    ])
  })
})
