import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Node } from '@keeb-cad/schema'
import {
  aDesign,
  aFreeGroup,
  aLayout,
  anId,
  aPartRef,
  aSlot,
  aSlotAnchor,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkStructure } from './check-structure'
import { dependencyCycleMessage } from './violations/dependency-cycle-message'

const onSlots = (...slots: Parameters<typeof aSlot>[0][]) =>
  aDesign({ layout: aLayout({ children: slots.map((slot) => aSlot(slot)) }) })

const inRoot = (...children: Node[]) => aDesign({ layout: aLayout({ children }) })

const slot = (id: string, anchoredTo?: string) =>
  aSlot({
    id: anId(id),
    ...(anchoredTo === undefined ? {} : { anchor: aSlotAnchor({ ref: anId(anchoredTo) }) }),
  })

const unknownTarget = (id: string) => ({
  kind: 'unknown-target',
  ids: [id],
  message: `The design has nothing of the right kind with the id "${id}".`,
})

const cycleRejection = (...ids: string[]) => ({
  kind: 'dependency-cycle',
  ids,
  message: dependencyCycleMessage(ids.map((id) => anId(id))),
})

describe('checkStructure', () => {
  it.each([
    ['a missing id', aPartRef('missing'), 'missing'],
    ["a slot's id, which is not a part", aPartRef('other'), 'other'],
  ])('refuses a slot part naming %s, naming it', (_role, part, expectedId) => {
    const previous = onSlots({ id: anId('other') })
    const next = onSlots({ id: anId('other') }, { id: anId('a'), part })

    const result = checkStructure(previous, next)

    expectErr(result)
    expect(result.error).toEqual(unknownTarget(expectedId))
  })

  it('lets an edit keep a reference that was already dangling before it', () => {
    const previous = onSlots({ id: anId('a'), part: aPartRef('missing') })
    const next = onSlots({ id: anId('a'), part: aPartRef('missing') }, { id: anId('b') })

    expectOk(checkStructure(previous, next))
  })

  it('passes a library target the design does not hold', () => {
    const next = onSlots({ id: anId('a'), part: aPartRef('lib:part/unknown') })

    expectOk(checkStructure(aDesign(), next))
  })

  it("names the removed part when a slot's part is deleted", () => {
    const previous = onSlots({ id: anId('a'), part: aPartRef('key') })
    const next = {
      ...previous,
      meta: { ...previous.meta, defaultPart: aPartRef('lib:part/x') },
      parts: [],
    }

    const result = checkStructure(previous, next)

    expectErr(result)
    expect(result.error).toEqual(unknownTarget('key'))
  })

  describe('node references', () => {
    it.each([
      ['a missing id', slot('n', 'missing'), 'missing'],
      ['a group through a slot anchor', slot('n', 'g'), 'g'],
    ])(
      'refuses an added anchor naming %s with unknown-target, naming it',
      (_role, n, expectedId) => {
        const group = aFreeGroup({ id: anId('g') })

        const result = checkStructure(inRoot(group), inRoot(group, n))

        expectErr(result)
        expect(result.error).toEqual(unknownTarget(expectedId))
      },
    )

    it('passes an added anchor naming a slot', () => {
      expectOk(checkStructure(inRoot(slot('a')), inRoot(slot('a'), slot('n', 'a'))))
    })

    it('lets an edit keep an anchor that was already dangling', () => {
      const previous = inRoot(slot('n', 'missing'))

      expectOk(checkStructure(previous, inRoot(slot('n', 'missing'), slot('b'))))
    })
  })

  describe('cycles', () => {
    it('refuses a cycle the edit closes, listed from the node whose dependency changed', () => {
      const previous = inRoot(slot('a', 'b'), slot('b', 'c'), slot('c'))
      const next = inRoot(slot('a', 'b'), slot('b', 'c'), slot('c', 'a'))

      const result = checkStructure(previous, next)

      expectErr(result)
      expect(result.error).toEqual(cycleRejection('c', 'a', 'b'))
    })

    it('lets an edit elsewhere keep a cycle the design already held', () => {
      const looped = [slot('a', 'b'), slot('b', 'c'), slot('c', 'a')]

      expectOk(checkStructure(inRoot(...looped), inRoot(...looped, slot('d'))))
    })

    it('names a dangling anchor before a cycle when one edit makes both', () => {
      const previous = inRoot(slot('a', 'b'), slot('b'), slot('n'))
      const next = inRoot(slot('a', 'b'), slot('b', 'a'), slot('n', 'missing'))

      const result = checkStructure(previous, next)

      expectErr(result)
      expect(result.error).toEqual(unknownTarget('missing'))
    })

    it('of two new cycles, refuses the one whose changed member is lowest by compareId', () => {
      const previous = inRoot(slot('p'), slot('q'), slot('r', 'p'), slot('s', 'q'))
      const next = inRoot(slot('p', 'r'), slot('q', 's'), slot('r', 'p'), slot('s', 'q'))

      const result = checkStructure(previous, next)

      expectErr(result)
      expect(result.error).toEqual(cycleRejection('p', 'r'))
    })
  })
})
