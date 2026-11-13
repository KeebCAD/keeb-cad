import type { Anchor, Rejection } from '@keeb-cad/schema'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import {
  aChainGroup,
  aDesign,
  aFreeGroup,
  aGroupAnchor,
  aLayout,
  anId,
  aSlot,
  aSlotAnchor,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { dependencyCycleMessage } from '../violations/dependency-cycle-message'
import { checkSetAnchor } from './check-set-anchor'

// n is a free slot, m hangs off n, g is a free group and c a chain holding c-child.
function arrange() {
  return aDesign({
    layout: aLayout({
      id: anId('root'),
      children: [
        aSlot({ id: anId('n') }),
        aSlot({ id: anId('m'), anchor: aSlotAnchor({ ref: anId('n') }) }),
        aFreeGroup({ id: anId('g') }),
        aChainGroup({ id: anId('c'), children: [aSlot({ id: anId('c-child') })] }),
      ],
    }),
  })
}

describe('checkSetAnchor', () => {
  it.each<[string, Anchor | undefined]>([
    ['an anchor on a group', aGroupAnchor({ ref: anId('g') })],
    ['no anchor', undefined],
  ])('passes a free slot given %s', (_role, anchor) => {
    expectOk(checkSetAnchor(arrange(), anId('n'), anchor))
  })

  it.each<[string, string, Anchor, Rejection]>([
    [
      'a node the design lacks with unknown-target',
      'missing',
      aGroupAnchor({ ref: anId('g') }),
      {
        kind: 'unknown-target',
        ids: [anId('missing')],
        message: 'The design has no node with the id "missing".',
      },
    ],
    [
      'a target the design lacks with unknown-target',
      'n',
      aSlotAnchor({ ref: anId('missing') }),
      {
        kind: 'unknown-target',
        ids: [anId('missing')],
        message: 'The design has nothing of the right kind with the id "missing".',
      },
    ],
    [
      'a group through a slot anchor with unknown-target',
      'n',
      aSlotAnchor({ ref: anId('g') }),
      {
        kind: 'unknown-target',
        ids: [anId('g')],
        message: 'The design has nothing of the right kind with the id "g".',
      },
    ],
    [
      'a chain child with chain-child-anchored',
      'c-child',
      aGroupAnchor({ ref: anId('g') }),
      {
        kind: 'chain-child-anchored',
        ids: [anId('c-child')],
        message: 'The node "c-child" sits in a chain, which places it, so it takes no anchor.',
      },
    ],
  ])('refuses %s, naming it', (_role, id, anchor, expected) => {
    const result = checkSetAnchor(arrange(), anId(id), anchor)

    expectErr(result)
    expect(result.error).toEqual(expected)
  })

  it('refuses closing a loop with dependency-cycle, listed from the node', () => {
    const result = checkSetAnchor(arrange(), anId('n'), aSlotAnchor({ ref: anId('m') }))

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'dependency-cycle',
      ids: ['n', 'm'],
      message: dependencyCycleMessage([anId('n'), anId('m')]),
    })
  })
})
