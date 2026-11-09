import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { versionSchema } from './version'

describe('versionSchema', () => {
  it.each([
    ['just below the first version', 0, false],
    ['on the first version', 1, true],
    ['just above the first version', 2, true],
    ['a fraction', 1.5, false],
  ])('on %s', (_role, input, expected) => {
    expect(v.safeParse(versionSchema, input).success).toBe(expected)
  })
})
