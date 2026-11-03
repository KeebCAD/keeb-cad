import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { idSchema } from './id'

describe('idSchema', () => {
  it('accepts a kebab-case id', () => {
    expect(v.safeParse(idSchema, 'thumb-far-2').success).toBe(true)
  })

  it.each(['Not_Kebab', 'thumb--far', '-thumb', 'thumb-', ''])('refuses %j', (id) => {
    expect(v.safeParse(idSchema, id).success).toBe(false)
  })
})
