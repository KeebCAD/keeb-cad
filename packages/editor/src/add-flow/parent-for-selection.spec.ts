import { aFreeGroup, anId, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { designOf } from '../testing/layout-canvas'
import { parentForSelection } from './parent-for-selection'

function design() {
  return designOf([
    aFreeGroup({ id: anId('g'), children: [aSlot({ id: anId('a') })] }),
    aSlot({ id: anId('b') }),
  ])
}

describe('parentForSelection', () => {
  it.each([
    ['the root with nothing selected', [], 'root'],
    ['a selected group itself', ['g'], 'g'],
    ["a selected slot's group", ['a'], 'g'],
    ['the root with several selected', ['g', 'b'], 'root'],
  ])('gives %s', (_role, selected, expected) => {
    expect(parentForSelection(design(), selected.map(anId))).toBe(anId(expected))
  })
})
