import { describe, expect, it } from 'vitest'

import { aRevision } from './revision'

describe('aRevision', () => {
  it.each([
    ['its default when given none', () => aRevision(), 'r1'],
    ['its argument', () => aRevision('r2'), 'r2'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })
})
