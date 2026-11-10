import { describe, expect, it } from 'vitest'

import { rotation, translation } from './affine'
import { apply } from './apply'
import { compose } from './compose'

describe('apply', () => {
  it('maps a point through a turn and then a move', () => {
    expect(apply(compose(translation(1, 2), rotation(90)), { x: 3, y: 0 })).toEqual({
      x: expect.closeTo(1, 9),
      y: expect.closeTo(5, 9),
    })
  })
})
