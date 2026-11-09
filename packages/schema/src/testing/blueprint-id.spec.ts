import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { aBlueprintId } from './blueprint-id'

describe('aBlueprintId', () => {
  it('returns its argument', () => {
    expect(aBlueprintId('lib:blueprint/k')).toBe('lib:blueprint/k')
  })

  it('throws on a value its schema refuses', () => {
    expect(() => aBlueprintId('lib:part/k')).toThrow(v.ValiError)
  })
})
