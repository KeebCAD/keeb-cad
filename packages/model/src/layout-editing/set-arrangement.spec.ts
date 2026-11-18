import type { Group, Node } from '@keeb-cad/schema'
import {
  aChainGroup,
  aDelta,
  aDesign,
  aFreeGroup,
  aLayout,
  anId,
  anOffset,
  aSlot,
  aSlotAnchor,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { setArrangement } from './set-arrangement'
import type { ArrangementEdit } from './types'

const G = anId('g')
const H = anId('h')
const K = anId('k')
const S = anId('s')

function arrange(...children: Node[]) {
  return aDesign({ layout: aLayout({ children }) })
}

describe('setArrangement', () => {
  it("chains a free group, clearing its children's anchors and keeping their offsets", () => {
    const offset = anOffset({ position: aVec2({ x: aDelta('3mm'), y: aDelta('0mm') }) })
    const design = arrange(
      aSlot({ id: S }),
      aFreeGroup({ id: G, children: [aSlot({ id: K, anchor: aSlotAnchor({ ref: S }), offset })] }),
    )

    setArrangement(design, [G], { arrangement: 'chain', axis: 'x' })

    expect(design.layout.children).toEqual([
      aSlot({ id: S }),
      aChainGroup({ id: G, axis: 'x', children: [aSlot({ id: K, offset })] }),
    ])
  })

  it.each<[string, Group, ArrangementEdit, Group]>([
    [
      "changes a chain's axis",
      aChainGroup({ id: G, axis: 'x' }),
      { arrangement: 'chain', axis: 'y' },
      aChainGroup({ id: G, axis: 'y' }),
    ],
    [
      'frees a chain, which then has no axis',
      aChainGroup({ id: G, axis: 'x' }),
      { arrangement: 'free' },
      aFreeGroup({ id: G }),
    ],
  ])('%s', (_role, group, edit, expected) => {
    const design = arrange(group)

    setArrangement(design, [G], edit)

    expect(design.layout.children).toEqual([expected])
  })

  it('arranges every group it names', () => {
    const design = arrange(aFreeGroup({ id: G }), aChainGroup({ id: H, axis: 'x' }))

    setArrangement(design, [G, H], { arrangement: 'chain', axis: 'y' })

    expect(design.layout.children).toEqual([
      aChainGroup({ id: G, axis: 'y' }),
      aChainGroup({ id: H, axis: 'y' }),
    ])
  })
})
