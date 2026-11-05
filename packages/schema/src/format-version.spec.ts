import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { formatVersionSchema } from './format-version'

describe('formatVersionSchema', () => {
  it.each([
    ['below the first version', 0, false],
    ['on the first version', 1, true],
    ['above the first version, which design-file refuses as too new', 2, true],
    ['not a whole number', 1.5, false],
    ['not a number', '1', false],
  ])('%s: accepted is %s', (_role, input, expectedAccepted) => {
    expect(v.safeParse(formatVersionSchema, input).success).toBe(expectedAccepted)
  })
})
