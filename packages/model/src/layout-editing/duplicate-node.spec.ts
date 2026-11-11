import type { Node } from '@keeb-cad/schema'
import { aDesign, aFreeGroup, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { duplicateNode } from './duplicate-node'

const ROOT = anId('root')

function arrange(children: Node[]) {
  return aDesign({ layout: aLayout({ id: ROOT, children }) })
}

const slots = (...ids: string[]) => ids.map((id) => aSlot({ id: anId(id) }))

describe('duplicateNode', () => {
  it('puts the copy right after the original', () => {
    const design = arrange(slots('thumb-home', 'thumb-far'))

    expect(duplicateNode(design, anId('thumb-home'))).toBeUndefined()
    expect(design.layout.children).toEqual(slots('thumb-home', 'thumb-home-2', 'thumb-far'))
  })

  it.each([
    [
      "'-2' taken",
      'thumb-home',
      ['thumb-home', 'thumb-home-2'],
      ['thumb-home', 'thumb-home-3', 'thumb-home-2'],
    ],
    [
      "'-2' free and '-3' taken",
      'thumb-home',
      ['thumb-home', 'thumb-home-3'],
      ['thumb-home', 'thumb-home-2', 'thumb-home-3'],
    ],
    [
      'a copy itself, stripping its ending',
      'thumb-home-2',
      ['thumb-home', 'thumb-home-2'],
      ['thumb-home', 'thumb-home-2', 'thumb-home-3'],
    ],
    ["an id ending in '-1'", 'a-1', ['a-1'], ['a-1', 'a-2']],
  ])('numbers a copy with %s', (_role, original, present, expectedIds) => {
    const design = arrange(slots(...present))

    duplicateNode(design, anId(original))

    expect(design.layout.children.map(({ id }) => id)).toEqual(expectedIds)
  })

  it('numbers every id in a copied group', () => {
    const design = arrange([aFreeGroup({ id: anId('g'), children: slots('a') })])

    duplicateNode(design, anId('g'))

    expect(design.layout.children).toEqual([
      aFreeGroup({ id: anId('g'), children: slots('a') }),
      aFreeGroup({ id: anId('g-2'), children: slots('a-2') }),
    ])
  })

  it("returns its check's rejection for the root, copying nothing", () => {
    const design = arrange(slots('a'))

    expect(duplicateNode(design, ROOT)).toMatchObject({ kind: 'root-required', ids: [ROOT] })
    expect(design).toEqual(arrange(slots('a')))
  })
})
