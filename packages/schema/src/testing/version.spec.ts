import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aVersion } from './version'

describe('aVersion', () => {
  it('returns its argument', () => {
    expect(aVersion(3)).toBe(3)
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aVersion(0)).toThrow(v.ValiError)
  })
})
