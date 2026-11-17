import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { expressionTooLongMessage } from './expression-too-long-message'

describe('expressionTooLongMessage', () => {
  it('names both names and every item, in the given order', () => {
    expect(expressionTooLongMessage('x', 'y', [anId('a'), anId('b')])).toBe(
      'Renaming "x" to "y" makes the expression of "a", "b" too long.',
    )
  })
})
