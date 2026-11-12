import { Option } from '@keeb-cad/result'
import { aFreeGroup, aLayout, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { lastChildId, nearestGroupId, nextSiblingId, subtreeIdsOf } from './node-tree'

function layout() {
  return aLayout({
    children: [
      aSlot({ id: anId('a') }),
      aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('g-child') })] }),
    ],
  })
}

describe('subtreeIdsOf', () => {
  it.each([
    ['a slot as itself', ['a'], ['a']],
    ['a group with its descendants', ['g'], ['g', 'g-child']],
    ['a slot inside a group not asked for as itself', ['g-child'], ['g-child']],
    ['ids from two branches in tree order', ['g-child', 'a'], ['a', 'g-child']],
    ['a group and its own child once each', ['g-child', 'g'], ['g', 'g-child']],
    ['an id not in the tree as nothing', ['missing'], []],
    ['no ids as nothing', [], []],
  ])('lists %s', (_role, ids, expected) => {
    expect(subtreeIdsOf(layout(), ids.map(anId))).toEqual(expected.map(anId))
  })
})

describe('nextSiblingId', () => {
  const thumbs = () =>
    aLayout({
      id: anId('root'),
      children: [aSlot({ id: anId('thumb-home') }), aSlot({ id: anId('thumb-far') })],
    })

  it.each([
    ['the next child for a child with one after it', 'thumb-home', Option.some(anId('thumb-far'))],
    ['none for the last child', 'thumb-far', Option.none()],
    ['none for the root', 'root', Option.none()],
  ])('gives %s', (_role, id, expected) => {
    expect(nextSiblingId(thumbs(), anId(id))).toEqual(expected)
  })
})

describe('the add flow tree queries', () => {
  const tree = () =>
    aLayout({
      id: anId('root'),
      children: [
        aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('a') })] }),
        aSlot({ id: anId('b') }),
      ],
    })

  it.each([
    ['a group as itself', 'g', Option.some(anId('g'))],
    ['a slot as its parent group', 'a', Option.some(anId('g'))],
    ['the root as itself', 'root', Option.some(anId('root'))],
    ['an id not in the tree as none', 'zz', Option.none()],
  ])('nearestGroupId gives %s', (_role, id, expected) => {
    expect(nearestGroupId(tree(), anId(id))).toEqual(expected)
  })

  it.each([
    ['the only child of a group', 'g', Option.some(anId('a'))],
    ['the last of the root children', 'root', Option.some(anId('b'))],
    ['none for a slot', 'b', Option.none()],
    ['none for an id not in the tree', 'zz', Option.none()],
  ])('lastChildId gives %s', (_role, id, expected) => {
    expect(lastChildId(tree(), anId(id))).toEqual(expected)
  })

  it('lastChildId gives none for an empty group', () => {
    const root = aLayout({ id: anId('root'), children: [aFreeGroup({ id: anId('e') })] })

    expect(lastChildId(root, anId('e'))).toEqual(Option.none())
  })
})
