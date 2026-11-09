import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aLibraryId } from './library-id'

describe('aLibraryId', () => {
  it('returns its argument', () => {
    expect(aLibraryId('lib:part/x')).toBe('lib:part/x')
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aLibraryId('lib:other/x')).toThrow(v.ValiError)
  })
})
