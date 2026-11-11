import { idSchema, type Design } from '@keeb-cad/schema'
import { aChainGroup, aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { addNode } from './add-node'

const ROOT = anId('root')

function arrange(children = [aSlot({ id: anId('thumb-home') })]): Design {
  return aDesign({ layout: aLayout({ id: ROOT, children }) })
}

describe('addNode', () => {
  it('mints an id for a node given none', () => {
    const design = arrange([])

    expect(addNode(design, {}, {})).toBeUndefined()
    expect(design.layout.children).toEqual([{ id: expect.toSatisfy((id) => v.is(idSchema, id)) }])
  })

  it.each([
    ['a new id', 'new-key', undefined],
    ['the design id, which names no item', 'corne', undefined],
  ])('keeps %s', (_role, id, expected) => {
    const design = arrange()

    expect(addNode(design, { id: anId(id) }, {})).toBe(expected)
    expect(design.layout.children.at(-1)).toEqual({ id })
  })

  it("returns its check's rejection for a taken id, adding nothing", () => {
    const design = arrange()

    expect(addNode(design, { id: anId('thumb-home') }, {})).toMatchObject({
      kind: 'id-taken',
      ids: ['thumb-home'],
    })
    expect(design).toEqual(arrange())
  })

  it('adds a group under a group named as the parent', () => {
    const design = arrange([aChainGroup({ id: anId('column') })])

    addNode(
      design,
      { id: anId('inner'), arrangement: 'free', children: [] },
      { parent: anId('column') },
    )

    expect(design.layout.children).toEqual([
      aChainGroup({
        id: anId('column'),
        children: [{ id: anId('inner'), arrangement: 'free', children: [] }],
      }),
    ])
  })

  describe('the index, in a parent with three children', () => {
    const three = () => [
      aSlot({ id: anId('a') }),
      aSlot({ id: anId('b') }),
      aSlot({ id: anId('c') }),
    ]

    it.each([
      ['0, first', 0, ['n', 'a', 'b', 'c']],
      ['2, before the last', 2, ['a', 'b', 'n', 'c']],
      ['3, on the child count: last', 3, ['a', 'b', 'c', 'n']],
      ['omitted: last', undefined, ['a', 'b', 'c', 'n']],
    ])('puts the node at %s', (_role, index, expectedIds) => {
      const design = arrange(three())

      expect(addNode(design, { id: anId('n') }, { index })).toBeUndefined()
      expect(design.layout.children.map(({ id }) => id)).toEqual(expectedIds)
    })
  })

  describe('the index, in a parent with no children', () => {
    it('puts the node at 0 as the only child', () => {
      const design = arrange([])

      expect(addNode(design, { id: anId('n') }, { index: 0 })).toBeUndefined()
      expect(design.layout.children).toEqual([{ id: 'n' }])
    })
  })
})
