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

  it('reads both messages for an empty id, the required one first', () => {
    expect(v.safeParse(idSchema, '')).toMatchObject({
      success: false,
      issues: [{ message: 'An id is required.' }, { message: 'An id is kebab-case.' }],
    })
  })

  it.each([
    ['on the one-character minimum', 'a'],
    ['just above the minimum', 'ab'],
  ])('accepts an id %s', (_role, id) => {
    expect(v.safeParse(idSchema, id)).toMatchObject({ success: true, output: id })
  })

  it('reads only the kebab-case message for a non-empty malformed id', () => {
    expect(v.safeParse(idSchema, 'Foo Bar')).toMatchObject({
      success: false,
      issues: [{ message: 'An id is kebab-case.' }],
    })
  })
})
