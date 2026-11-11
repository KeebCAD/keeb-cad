import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aBlueprintDesignPart, aDesign, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkAddNode } from './check-add-node'

const ROOT = anId('root')

function arrange() {
  return aDesign({
    parts: [aBlueprintDesignPart({ id: anId('key') })],
    layout: aLayout({
      id: ROOT,
      children: [aSlot({ id: anId('a') }), aSlot({ id: anId('b') }), aSlot({ id: anId('c') })],
    }),
  })
}

describe('checkAddNode', () => {
  it.each([
    ['2, below the child count', 2],
    ['3, on the child count', 3],
  ])('accepts index %s', (_role, index) => {
    expectOk(checkAddNode(arrange(), anId('n'), { index }))
  })

  it('refuses index 4, just above the child count, with index-out-of-range naming the parent', () => {
    const result = checkAddNode(arrange(), anId('n'), { index: 4 })

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'index-out-of-range',
      ids: [ROOT],
      message: 'The group "root" has 3 children, fewer than index 4.',
    })
  })

  it.each([
    ['a missing id', 'missing'],
    ['a slot', 'a'],
  ])('refuses a parent that is %s with unknown-target naming it', (_role, parent) => {
    const result = checkAddNode(arrange(), anId('n'), { parent: anId(parent) })

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'unknown-target',
      ids: [anId(parent)],
      message: `The design has no group with the id "${parent}".`,
    })
  })

  it.each([
    ["a design part's id", 'key'],
    ["a node's id", 'b'],
  ])('refuses %s with id-taken naming it', (_role, id) => {
    const result = checkAddNode(arrange(), anId(id), {})

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'id-taken',
      ids: [anId(id)],
      message: `The design already has an item with the id "${id}".`,
    })
  })

  it('refuses index 1 in a parent with no children with index-out-of-range', () => {
    const design = aDesign({ layout: aLayout({ id: ROOT, children: [] }) })

    const result = checkAddNode(design, anId('n'), { index: 1 })

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'index-out-of-range',
      ids: [ROOT],
      message: 'The group "root" has 0 children, fewer than index 1.',
    })
  })
})
