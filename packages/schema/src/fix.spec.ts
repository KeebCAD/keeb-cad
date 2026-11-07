import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { fixSchema } from './fix'

describe('fixSchema', () => {
  it('refuses every fix while no command offers one', () => {
    expect(v.safeParse(fixSchema, { command: 'x', input: {} }).success).toBe(false)
  })
})
