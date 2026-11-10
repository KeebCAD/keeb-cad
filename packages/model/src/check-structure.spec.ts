import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayout, anId, aPartRef, aSlot } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkStructure } from './check-structure'

const onSlots = (...slots: Parameters<typeof aSlot>[0][]) =>
  aDesign({ layout: aLayout({ children: slots.map((slot) => aSlot(slot)) }) })

describe('checkStructure', () => {
  it.each([
    ['a missing id', aPartRef('missing'), 'missing'],
    ["a slot's id, which is not a part", aPartRef('other'), 'other'],
  ])('refuses a slot part naming %s, naming it', (_role, part, expectedId) => {
    const previous = onSlots({ id: anId('other') })
    const next = onSlots({ id: anId('other') }, { id: anId('a'), part })

    const result = checkStructure(previous, next)

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'unknown-target', ids: [expectedId] })
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
    expect(result.error).toMatchObject({ kind: 'unknown-target', ids: ['key'] })
  })
})
