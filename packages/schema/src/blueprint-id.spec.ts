import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { blueprintIdSchema } from './blueprint-id'

describe('blueprintIdSchema', () => {
  it.each([
    ['a named blueprint', 'lib:blueprint/x', true],
    ['the prefix with no name', 'lib:blueprint/', false],
    ['another library kind', 'lib:part/x', false],
  ])('on %s', (_role, input, expected) => {
    expect(v.safeParse(blueprintIdSchema, input).success).toBe(expected)
  })
})
