import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { anchorSchema } from './anchor'

describe('anchorSchema', () => {
  it.each([
    ['a slot anchor with no attach point', { type: 'slot', ref: 'a' }],
    ['a slot anchor on a named attach point', { type: 'slot', ref: 'a', attach: 'edge-top' }],
  ])('accepts %s', (_role, anchor) => {
    expect(v.safeParse(anchorSchema, anchor).issues).toBeUndefined()
  })

  it.each([
    ['an attach point outside the nine', { type: 'slot', ref: 'a', attach: 'edge-middle' }],
    ['an attach point on a group anchor', { type: 'group', ref: 'g', attach: 'center' }],
    ['a vertex anchor', { type: 'vertex', ref: 'v' }],
  ])('refuses %s', (_role, anchor) => {
    expect(v.safeParse(anchorSchema, anchor).success).toBe(false)
  })
})
