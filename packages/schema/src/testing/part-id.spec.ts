import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aPartId } from './part-id'

describe('aPartId', () => {
  it('returns its argument', () => {
    expect(aPartId('lib:part/x')).toBe('lib:part/x')
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aPartId('x')).toThrow(v.ValiError)
  })
})
