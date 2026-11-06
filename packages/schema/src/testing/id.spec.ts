import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { anId } from './id'

describe('anId', () => {
  it.each([
    ['its default when given none', () => anId(), 'id'],
    ['its argument', () => anId('a-b'), 'a-b'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => anId('Corne')).toThrow(v.ValiError)
  })
})
