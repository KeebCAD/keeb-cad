import { aGroupAnchor, anId, aSlot, aSlotAnchor } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { anchorText } from './anchor-text'
import type { AnchoredNode } from './types'

describe('anchorText', () => {
  it.each<[string, AnchoredNode, string]>([
    [
      'a slot anchor with no attach as its slot and center',
      { node: aSlot({ anchor: aSlotAnchor({ ref: anId('s') }) }) },
      's · center',
    ],
    [
      'a slot anchor as its slot and attach point',
      { node: aSlot({ anchor: aSlotAnchor({ ref: anId('s'), attach: 'edge-top' }) }) },
      's · edge-top',
    ],
    [
      'a group anchor as its group',
      { node: aSlot({ anchor: aGroupAnchor({ ref: anId('g') }) }) },
      'g',
    ],
    ['no anchor as default', { node: aSlot() }, 'default'],
    [
      'a chain child as its place in the chain',
      { node: aSlot(), chain: { parent: anId('thumb'), index: 1, count: 3 } },
      'chain thumb · 2 of 3',
    ],
  ])('reads %s', (_role, anchored, expected) => {
    expect(anchorText(anchored)).toBe(expected)
  })
})
