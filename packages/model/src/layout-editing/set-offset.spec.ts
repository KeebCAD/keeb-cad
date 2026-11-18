import type { Node, Offset } from '@keeb-cad/schema'
import {
  aDelta,
  aDesign,
  aLayout,
  anAngle,
  anId,
  anOffset,
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { setOffset } from './set-offset'
import type { OffsetEdit } from './types'

const A = anId('a')
const B = anId('b')

function arrange(...children: Node[]) {
  return aDesign({ layout: aLayout({ children }) })
}

const slotA = (offset?: Offset) => aSlot({ id: A, ...(offset === undefined ? {} : { offset }) })

describe('setOffset', () => {
  it.each<[string, Offset | undefined, OffsetEdit, Offset | undefined]>([
    [
      'fills the other axis of a position set for the first time with 0mm',
      undefined,
      { position: { x: aDelta('5mm') } },
      anOffset({ position: aVec2({ x: aDelta('5mm'), y: aDelta('0mm') }) }),
    ],
    [
      'keeps the other axis of a position already set',
      anOffset({ position: aVec2({ x: aDelta('1mm'), y: aDelta('2mm') }) }),
      { position: { x: aDelta('5mm') } },
      anOffset({ position: aVec2({ x: aDelta('5mm'), y: aDelta('2mm') }) }),
    ],
    [
      'fills the other axis of a pivot set for the first time with 0mm',
      undefined,
      { pivot: { y: aDelta('2mm') } },
      anOffset({ pivot: aVec2({ x: aDelta('0mm'), y: aDelta('2mm') }) }),
    ],
    [
      'clears a field given null, keeping the others',
      anOffset({ position: aVec2({ x: aDelta('1mm') }), rotation: anAngle('5deg') }),
      { rotation: null },
      anOffset({ position: aVec2({ x: aDelta('1mm') }) }),
    ],
    [
      'removes the offset when null clears its last field',
      anOffset({ rotation: anAngle('5deg') }),
      { rotation: null },
      undefined,
    ],
    [
      'leaves no offset when null clears a field never set',
      undefined,
      { position: null },
      undefined,
    ],
    [
      'changes nothing for an edit with no field',
      anOffset({ rotation: anAngle('5deg') }),
      {},
      anOffset({ rotation: anAngle('5deg') }),
    ],
    [
      'changes nothing for an empty position',
      anOffset({ rotation: anAngle('5deg') }),
      { position: {} },
      anOffset({ rotation: anAngle('5deg') }),
    ],
  ])('%s', (_role, offset, edit, expected) => {
    const design = arrange(slotA(offset))

    setOffset(design, [A], edit)

    expect(design.layout.children).toEqual([slotA(expected)])
  })

  it('sets every node it names', () => {
    const design = arrange(aSlot({ id: A }), aSlot({ id: B }))

    setOffset(design, [A, B], { rotation: anAngle('5deg') })

    expect(design.layout.children).toEqual([
      aSlot({ id: A, offset: anOffset({ rotation: anAngle('5deg') }) }),
      aSlot({ id: B, offset: anOffset({ rotation: anAngle('5deg') }) }),
    ])
  })

  it('sets a node named twice once', () => {
    const design = arrange(aSlot({ id: A }))

    setOffset(design, [A, A], { rotation: anAngle('5deg') })

    expect(design.layout.children).toEqual([
      aSlot({ id: A, offset: anOffset({ rotation: anAngle('5deg') }) }),
    ])
  })
})
