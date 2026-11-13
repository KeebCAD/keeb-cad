import { aChainGroup, aLayout, anId, aSlot, aSlotAnchor } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkAnchors } from './check-anchors'
import { dependencyGraph } from './dependency-graph'
import { dependencyOrder } from './dependency-order'

describe('dependencyOrder', () => {
  it('lists each placed node after the one it depends on, even one later in the tree', () => {
    // One line of dependencies: c on root, c-0 on c, c-1 on c-0, a on c-1.
    const layout = aLayout({
      id: anId('root'),
      children: [
        aSlot({ id: anId('a'), anchor: aSlotAnchor({ ref: anId('c-1') }) }),
        aChainGroup({
          id: anId('c'),
          children: [aSlot({ id: anId('c-0') }), aSlot({ id: anId('c-1') })],
        }),
      ],
    })

    expect(dependencyOrder(dependencyGraph(layout), new Set())).toEqual([
      'root',
      'c',
      'c-0',
      'c-1',
      'a',
    ])
  })

  it('leaves out a node unplaced by an anchor that does not resolve', () => {
    const layout = aLayout({
      id: anId('root'),
      children: [
        aSlot({ id: anId('a') }),
        aSlot({ id: anId('b'), anchor: aSlotAnchor({ ref: anId('missing') }) }),
      ],
    })

    expect(dependencyOrder(dependencyGraph(layout), checkAnchors(layout).unplaced)).toEqual([
      'root',
      'a',
    ])
  })
})
