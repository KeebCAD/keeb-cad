import { describe, expect, it } from 'vitest'

import { compareCodeUnits } from './compare-code-units'

describe('compareCodeUnits', () => {
  it.each([
    ['before', 'a', 'b', -1],
    ['equal', 'a', 'a', 0],
    ['after', 'b', 'a', 1],
    ['an upper-case letter before a lower-case one', 'Z', 'a', -1],
  ])('on %s', (_role, a, b, expected) => {
    expect(compareCodeUnits(a, b)).toBe(expected)
  })
})
