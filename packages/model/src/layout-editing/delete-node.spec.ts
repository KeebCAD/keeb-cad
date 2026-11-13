import type { Node } from '@keeb-cad/schema'
import {
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

import { deleteNode } from './delete-node'

const ROOT = anId('root')

function arrange(children: Node[] = [aSlot({ id: anId('a') }), aSlot({ id: anId('b') }), group()]) {
  return aDesign({ layout: aLayout({ id: ROOT, children }) })
}

function group() {
  return aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('g-child') })] })
}

describe('deleteNode', () => {
  it.each([
    ['two slots', ['a', 'b'], [group()]],
    [
      'a group and its own child',
      ['g', 'g-child'],
      [aSlot({ id: anId('a') }), aSlot({ id: anId('b') })],
    ],
    ['no ids', [], arrange().layout.children],
  ])('deletes %s', (_role, ids, expected) => {
    const design = arrange()

    expect(
      deleteNode(
        design,
        ids.map((id) => anId(id)),
      ),
    ).toBeUndefined()
    expect(design.layout.children).toEqual(expected)
  })

  it("returns its check's rejection for the root, deleting nothing", () => {
    const design = arrange()

    expect(deleteNode(design, [anId('a'), ROOT])).toMatchObject({
      kind: 'root-required',
      ids: [ROOT],
    })
    expect(design).toEqual(arrange())
  })

  it('clears every anchor naming a deleted node or its child, keeping offsets and other anchors', () => {
    const offset = anOffset({ position: aVec2({ x: aDelta('2mm') }) })
    const design = arrange([
      aFreeGroup({ id: anId('m'), children: [aSlot({ id: anId('m-child') })] }),
      aSlot({ id: anId('other') }),
      aSlot({ id: anId('b'), offset, anchor: aGroupAnchor({ ref: anId('m') }) }),
      aSlot({ id: anId('c'), offset, anchor: aSlotAnchor({ ref: anId('m-child') }) }),
      aSlot({ id: anId('d'), anchor: aSlotAnchor({ ref: anId('other') }) }),
    ])

    deleteNode(design, [anId('m')])

    expect(design.layout.children).toEqual([
      aSlot({ id: anId('other') }),
      aSlot({ id: anId('b'), offset }),
      aSlot({ id: anId('c'), offset }),
      aSlot({ id: anId('d'), anchor: aSlotAnchor({ ref: anId('other') }) }),
    ])
  })
})
