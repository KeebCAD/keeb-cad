import type { Node } from '@keeb-cad/schema'
import { aDesign, aFreeGroup, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
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

  it('refuses a list naming a missing id with unknown-target naming it, deleting nothing', () => {
    const design = arrange()

    expect(deleteNode(design, [anId('a'), anId('missing')])).toMatchObject({
      kind: 'unknown-target',
      ids: ['missing'],
    })
    expect(design).toEqual(arrange())
  })

  it('refuses the root with root-required naming it', () => {
    const design = arrange()

    expect(deleteNode(design, [ROOT])).toMatchObject({ kind: 'root-required', ids: [ROOT] })
    expect(design).toEqual(arrange())
  })
})
