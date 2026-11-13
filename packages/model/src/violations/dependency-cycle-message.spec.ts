import { anId } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { dependencyCycleMessage } from './dependency-cycle-message'

describe('dependencyCycleMessage', () => {
  it.each([
    ['three nodes', ['a', 'b', 'c'], 'The nodes form a loop: "a" → "b" → "c" → "a".'],
    ['a node on itself', ['a'], 'The nodes form a loop: "a" → "a".'],
  ])('words a loop of %s, the first id repeated at the end', (_role, ids, expected) => {
    expect(dependencyCycleMessage(ids.map((id) => anId(id)))).toBe(expected)
  })
})
