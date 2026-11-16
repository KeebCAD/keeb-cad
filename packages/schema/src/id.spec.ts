import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { idSchema } from './id'

const REQUIRED = 'An id is required.'
const KEBAB_CASE = 'An id is kebab-case.'

describe('idSchema', () => {
  it('accepts a kebab-case id', () => {
    expect(v.safeParse(idSchema, 'thumb-far-2').success).toBe(true)
  })

  it.each([
    ['Not_Kebab', [{ message: KEBAB_CASE }]],
    ['thumb--far', [{ message: KEBAB_CASE }]],
    ['-thumb', [{ message: KEBAB_CASE }]],
    ['thumb-', [{ message: KEBAB_CASE }]],
  ])('refuses %j with its issues', (id, expectedIssues) => {
    expect(v.safeParse(idSchema, id)).toMatchObject({ success: false, issues: expectedIssues })
  })

  it('reads both messages for an empty id, the required one first', () => {
    expect(v.safeParse(idSchema, '')).toMatchObject({
      success: false,
      issues: [{ message: REQUIRED }, { message: KEBAB_CASE }],
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
