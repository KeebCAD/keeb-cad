import type { Node } from '@keeb-cad/schema'
import {
  aChainGroup,
  aFreeGroup,
  aGroupAnchor,
  aLayout,
  anId,
  aSlot,
  aSlotAnchor,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkAnchors } from './check-anchors'

const inRoot = (...children: Node[]) => aLayout({ id: anId('root'), children })

const onSlot = (id: string, ref: string) =>
  aSlot({ id: anId(id), anchor: aSlotAnchor({ ref: anId(ref) }) })

describe('checkAnchors', () => {
  it('finds nothing in a layout with no anchors', () => {
    const layout = inRoot(
      aChainGroup({ id: anId('c'), children: [aSlot({ id: anId('a') })] }),
      aSlot({ id: anId('b') }),
    )

    expect(checkAnchors(layout)).toEqual({ cycles: [], unresolvable: [], unplaced: new Set() })
  })

  it.each([
    ['one member', [onSlot('n', 'n')], ['n']],
    ['two members', [onSlot('a', 'b'), onSlot('b', 'a')], ['a', 'b']],
    [
      'three members, met first at c',
      [onSlot('c', 'a'), onSlot('b', 'c'), onSlot('a', 'b')],
      ['a', 'b', 'c'],
    ],
  ])(
    'lists a loaded cycle of %s in cycle order from its lowest id',
    (_role, children, expected) => {
      expect(checkAnchors(inRoot(...children)).cycles).toEqual([expected])
    },
  )

  it('leaves a cycle and everything below it unplaced, and what hangs off a placed slot placed', () => {
    const layout = inRoot(
      aFreeGroup({
        id: anId('a'),
        anchor: aGroupAnchor({ ref: anId('b') }),
        children: [aSlot({ id: anId('a1') }), onSlot('a2', 'x')],
      }),
      aChainGroup({
        id: anId('b'),
        anchor: aGroupAnchor({ ref: anId('a') }),
        children: [aSlot({ id: anId('b1') }), aSlot({ id: anId('b2') })],
      }),
      aSlot({ id: anId('x') }),
    )

    expect(checkAnchors(layout).unplaced).toEqual(new Set(['a', 'b', 'a1', 'b1', 'b2']))
  })

  it.each([
    ['a missing id', aSlotAnchor({ ref: anId('missing') })],
    ['a group through a slot anchor', aSlotAnchor({ ref: anId('h') })],
  ])(
    'reports an anchor naming %s as unresolvable, leaving the node and its child unplaced',
    (_role, anchor) => {
      const layout = inRoot(
        aFreeGroup({ id: anId('h') }),
        aFreeGroup({ id: anId('n'), anchor, children: [aSlot({ id: anId('k') })] }),
      )

      expect(checkAnchors(layout)).toEqual({
        cycles: [],
        unresolvable: ['n'],
        unplaced: new Set(['n', 'k']),
      })
    },
  )

  it('reports a root anchored to its child as a cycle, leaving everything unplaced', () => {
    const layout = aLayout({
      id: anId('root'),
      anchor: aSlotAnchor({ ref: anId('a') }),
      children: [aSlot({ id: anId('a') })],
    })

    expect(checkAnchors(layout)).toEqual({
      cycles: [['a', 'root']],
      unresolvable: [],
      unplaced: new Set(['root', 'a']),
    })
  })

  it('reports a root anchored to a missing id as unresolvable, leaving everything unplaced', () => {
    const layout = aLayout({
      id: anId('root'),
      anchor: aSlotAnchor({ ref: anId('missing') }),
      children: [aSlot({ id: anId('a') })],
    })

    expect(checkAnchors(layout)).toEqual({
      cycles: [],
      unresolvable: ['root'],
      unplaced: new Set(['root', 'a']),
    })
  })
})
