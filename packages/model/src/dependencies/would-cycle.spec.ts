import { aChainGroup, aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { wouldCycle } from './would-cycle'

describe('wouldCycle', () => {
  it.each([
    ['a chain group to its own last child', 'c', 'b', true],
    ['a free slot to a chain child', 'x', 'b', false],
    ['a slot to itself', 'x', 'x', true],
    ['the root to anything', 'root', 'x', true],
    ['a chain group to a free sibling', 'c', 'x', false],
  ])('answers %s', (_role, node, target, expected) => {
    const design = aDesign({
      layout: aLayout({
        id: anId('root'),
        children: [
          aChainGroup({
            id: anId('c'),
            children: [aSlot({ id: anId('a') }), aSlot({ id: anId('b') })],
          }),
          aSlot({ id: anId('x') }),
        ],
      }),
    })

    expect(wouldCycle(design, anId(node), anId(target))).toBe(expected)
  })
})
