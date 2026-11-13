import { describe, expect, it } from 'vitest'

import { reflectionAcrossY } from './affine'
import { apply } from './apply'

describe('reflectionAcrossY', () => {
  it('maps a point to the other side of the y-axis at the same height', () => {
    const point = { x: 3, y: 5 }
    const expectedReflected = { x: -3, y: 5 }

    expect(apply(reflectionAcrossY(), point)).toEqual(expectedReflected)
  })
})
