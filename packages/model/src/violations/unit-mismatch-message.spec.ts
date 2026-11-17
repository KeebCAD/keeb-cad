import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { unitMismatchMessage } from './unit-mismatch-message'

describe('unitMismatchMessage', () => {
  it('names the item whose expression has the wrong unit', () => {
    expect(unitMismatchMessage([anId('a')])).toBe('The expression of "a" has the wrong unit.')
  })
})
