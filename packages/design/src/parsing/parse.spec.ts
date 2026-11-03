import { expectErr, expectOk } from '@keeb-cad/result/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { parse } from './parse'

describe('parse', () => {
  it('returns a fresh copy of a valid value', () => {
    const value = { items: [{ name: 'a' }] }

    const parsed = parse(v.object({ items: v.array(v.object({ name: v.string() })) }), value)

    expectOk(parsed)
    expect(parsed.value).toEqual(value)
    expect(parsed.value.items[0]).not.toBe(value.items[0])
  })

  it('returns plain issues with object keys and array indexes', () => {
    const schema = v.object({ items: v.array(v.object({ name: v.string() })) })

    const parsed = parse(schema, { items: [{ name: 1 }] })

    expectErr(parsed)
    expect(parsed.error).toEqual([{ path: ['items', 0, 'name'], message: expect.any(String) }])
  })

  it('returns an empty path for a root issue', () => {
    const parsed = parse(v.string(), 1)

    expectErr(parsed)
    expect(parsed.error).toEqual([{ path: [], message: expect.any(String) }])
  })
})
