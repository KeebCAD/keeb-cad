import type { Anchor, Rejection } from '@keeb-cad/schema'
import {
  aChainGroup,
  aDelta,
  aDesign,
  aFreeGroup,
  aGroupAnchor,
  aLayout,
  anId,
  anOffset,
  aSlot,
  aSlotAnchor,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { dependencyCycleMessage } from '../violations/dependency-cycle-message'
import { setAnchor } from './set-anchor'

const anOffsetOf2mm = () => anOffset({ position: aVec2({ x: aDelta('2mm') }) })

// n is a free slot with an offset, m hangs off n, g is a free group and c a chain holding c-child.
function arrange(anchor?: Anchor) {
  return aDesign({
    layout: aLayout({
      id: anId('root'),
      children: [
        aFreeGroup({ id: anId('g') }),
        aSlot({
          id: anId('n'),
          offset: anOffsetOf2mm(),
          ...(anchor === undefined ? {} : { anchor }),
        }),
        aSlot({ id: anId('m'), anchor: aSlotAnchor({ ref: anId('n') }) }),
        aChainGroup({ id: anId('c'), children: [aSlot({ id: anId('c-child') })] }),
      ],
    }),
  })
}

describe('setAnchor', () => {
  it('sets the anchor and keeps the offset', () => {
    const design = arrange()
    const anchor = aGroupAnchor({ ref: anId('g') })

    expect(setAnchor(design, anId('n'), anchor)).toBeUndefined()
    expect(design.layout.children.at(1)).toEqual({ id: 'n', offset: anOffsetOf2mm(), anchor })
  })

  it('removes the anchor when given none and keeps the offset', () => {
    const design = arrange(aGroupAnchor({ ref: anId('g') }))

    expect(setAnchor(design, anId('n'), undefined)).toBeUndefined()
    expect(design.layout.children.at(1)).toEqual({ id: 'n', offset: anOffsetOf2mm() })
  })

  it.each<[string, string, Anchor, Rejection]>([
    [
      'a node the design lacks',
      'missing',
      aGroupAnchor({ ref: anId('g') }),
      {
        kind: 'unknown-target',
        ids: [anId('missing')],
        message: 'The design has no node with the id "missing".',
      },
    ],
    [
      'a target the design lacks',
      'n',
      aSlotAnchor({ ref: anId('missing') }),
      {
        kind: 'unknown-target',
        ids: [anId('missing')],
        message: 'The design has nothing of the right kind with the id "missing".',
      },
    ],
    [
      'a group through a slot anchor',
      'n',
      aSlotAnchor({ ref: anId('g') }),
      {
        kind: 'unknown-target',
        ids: [anId('g')],
        message: 'The design has nothing of the right kind with the id "g".',
      },
    ],
    [
      'a chain child',
      'c-child',
      aGroupAnchor({ ref: anId('g') }),
      {
        kind: 'chain-child-anchored',
        ids: [anId('c-child')],
        message: 'The node "c-child" sits in a chain, which places it, so it takes no anchor.',
      },
    ],
    [
      'an anchor closing n → m → n',
      'n',
      aSlotAnchor({ ref: anId('m') }),
      {
        kind: 'dependency-cycle',
        ids: [anId('n'), anId('m')],
        message: dependencyCycleMessage([anId('n'), anId('m')]),
      },
    ],
  ])("returns its check's rejection for %s, changing nothing", (_role, id, anchor, expected) => {
    const design = arrange()

    expect({ result: setAnchor(design, anId(id), anchor), design }).toEqual({
      result: expected,
      design: arrange(),
    })
  })
})
