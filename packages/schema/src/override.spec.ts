import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { overrideSchema } from './override'

describe('overrideSchema', () => {
  it.each([
    [
      'a side-part override removing the part',
      { type: 'side-part', target: 'right/a', part: null },
    ],
    [
      'a side-part override swapping the part',
      { type: 'side-part', target: 'right/a', part: 'key' },
    ],
    [
      'a side-component override',
      { type: 'side-component', target: 'right/a', component: 'encoder' },
    ],
  ])('accepts %s', (_role, input) => {
    expect(v.safeParse(overrideSchema, input).issues).toBeUndefined()
  })

  it.each([
    [
      'a side-part override with a component field',
      { type: 'side-part', target: 'right/a', part: null, component: 'encoder' },
    ],
    ['a side-part override with its part absent', { type: 'side-part', target: 'right/a' }],
  ])('refuses %s', (_role, input) => {
    expect(v.safeParse(overrideSchema, input).success).toBe(false)
  })
})
