import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { unknownNodeMessage } from './unknown-node-message'

describe('unknownNodeMessage', () => {
  it.each([
    ['one missing id', ['a'], 'The design has no node with the id "a".'],
    [
      'several missing ids, in the given order',
      ['a', 'b'],
      'The design has no node with the id "a", "b".',
    ],
  ])('names %s', (_role, ids, expected) => {
    expect(unknownNodeMessage(ids.map((id) => anId(id)))).toBe(expected)
  })
})
