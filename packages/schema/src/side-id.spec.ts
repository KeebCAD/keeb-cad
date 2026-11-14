import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { sideIdSchema } from './side-id'

describe('sideIdSchema', () => {
  it.each([
    ['a left placement', 'left/thumb-far', true],
    ['a right placement', 'right/thumb-far', true],
    ['the unibody side, which takes no override', 'whole/thumb-far', false],
    ['a side with no id', 'left/', false],
    ['an id with no side', 'thumb-far', false],
    ['an id that is not kebab-case', 'left/Thumb', false],
  ])('on %s', (_role, input, expected) => {
    expect(v.safeParse(sideIdSchema, input).success).toBe(expected)
  })
})
