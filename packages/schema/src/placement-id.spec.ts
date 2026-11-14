import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { placementIdSchema } from './placement-id'

describe('placementIdSchema', () => {
  it.each([
    ['a left placement', 'left/a', true],
    ['a right placement', 'right/a', true],
    ['a unibody placement', 'whole/a', true],
    ['an id with no side', 'a', false],
    ['a side with no id', 'left/', false],
    ['a prefix that is no placement side', 'top/a', false],
    ['an id that is not kebab-case', 'left/A', false],
    ['empty text', '', false],
  ])('on %s', (_role, input, expected) => {
    expect(v.safeParse(placementIdSchema, input).success).toBe(expected)
  })
})
