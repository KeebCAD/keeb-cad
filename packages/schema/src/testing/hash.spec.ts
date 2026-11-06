import { describe, expect, it } from 'vitest'

import { aHash } from './hash'

describe('aHash', () => {
  it.each([
    ['its default when given none', () => aHash(), 'h1'],
    ['its argument', () => aHash('h2'), 'h2'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })
})
