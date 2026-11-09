import { describe, expect, it } from 'vitest'

import { compareId } from './compare-id'

describe('compareId', () => {
  it.each([
    ['before', 'a', 'b', -1],
    ['equal', 'a', 'a', 0],
    ['after', 'b', 'a', 1],
    ['an upper-case letter before a lower-case one', 'Z', 'a', -1],
  ])('on %s', (_role, a, b, expected) => {
    expect(compareId(a, b)).toBe(expected)
  })
})
