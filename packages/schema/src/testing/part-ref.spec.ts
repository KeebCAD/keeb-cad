import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aPartRef } from './part-ref'

describe('aPartRef', () => {
  it('returns its argument', () => {
    expect(aPartRef('lib:part/x')).toBe('lib:part/x')
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aPartRef('lib:part/')).toThrow(v.ValiError)
  })
})
