import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aFormatVersion } from './format-version'

describe('aFormatVersion', () => {
  it.each([
    ['its default when given none', () => aFormatVersion(), 1],
    ['its argument', () => aFormatVersion(2), 2],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aFormatVersion(0)).toThrow(v.ValiError)
  })
})
