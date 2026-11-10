import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aDelta } from './delta'

describe('aDelta', () => {
  it.each([
    ['its default when given none', () => aDelta(), '0mm'],
    ['its argument', () => aDelta('-2mm'), '-2mm'],
  ])('returns %s', (_role, build, expected) => {
    expect(build()).toBe(expected)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aDelta('2deg')).toThrow(v.ValiError)
  })
})
