import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { BlueprintInputs, LibraryData } from '@keeb-cad/schema'
import {
  aBlueprintDeclaration,
  aBlueprintDesignPart,
  aBlueprintId,
  aDesign,
  aLayout,
  aMeta,
  anId,
  anOptionInput,
  aPartRef,
  aSlot,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { blueprintInputInvalidMessage } from '../violations/blueprint-input-invalid-message'
import { checkInputs } from './check-inputs'

const CHOC_KEY = aBlueprintId('lib:blueprint/choc-key')
const size = anOptionInput({ options: ['1u', '1.5u'], default: '1u', perSlot: true })

const declarations: LibraryData['declarations'] = Object.fromEntries([
  [CHOC_KEY, { 1: aBlueprintDeclaration({ id: CHOC_KEY, inputs: { size } }) }],
])

const withSlots = (...slots: { id: string; inputs?: BlueprintInputs }[]) =>
  aDesign({
    layout: aLayout({
      children: slots.map(({ id, inputs }) => aSlot({ id: anId(id), inputs })),
    }),
  })

const inputRejection = (slot: string, input: string, reason: 'unknown' | 'bad-value') => ({
  kind: 'blueprint-input-invalid',
  ids: [slot],
  message: blueprintInputInvalidMessage(
    reason === 'unknown'
      ? { owner: { scope: 'slot', id: anId(slot) }, input, reason }
      : { owner: { scope: 'slot', id: anId(slot) }, input, reason, value: '2u', expected: size },
  ),
})

describe('checkInputs', () => {
  it('does not check a slot whose only level is a library part ref', () => {
    const library = aMeta({ defaultPart: aPartRef('lib:part/x') })
    const previous = aDesign({ meta: library })
    const next = aDesign({
      meta: library,
      layout: aLayout({ children: [aSlot({ id: anId('s'), inputs: { size: '2u' } })] }),
    })

    expectOk(checkInputs(previous, next, declarations))
  })

  it('refuses a slot added under part key with a value outside the options, naming the slot', () => {
    const result = checkInputs(
      aDesign(),
      withSlots({ id: 's', inputs: { size: '2u' } }),
      declarations,
    )

    expectErr(result)
    expect(result.error).toEqual(inputRejection('s', 'size', 'bad-value'))
  })

  it('lets an edit elsewhere keep a fault the design already held', () => {
    const previous = withSlots({ id: 's', inputs: { size: '2u' } })
    const next = { ...previous, meta: { ...previous.meta, name: 'Renamed' } }

    expectOk(checkInputs(previous, next, declarations))
  })

  it('refuses a new reason on a slot that already held a fault', () => {
    const previous = withSlots({ id: 's', inputs: { size: '2u' } })
    const next = withSlots({ id: 's', inputs: { colour: 'red' } })

    const result = checkInputs(previous, next, declarations)

    expectErr(result)
    expect(result.error).toEqual(inputRejection('s', 'colour', 'unknown'))
  })

  it('of two new faults, refuses the one whose owner is lowest by compareId', () => {
    const next = withSlots(
      { id: 'q', inputs: { size: '2u' } },
      { id: 'p', inputs: { colour: 'red' } },
    )

    const result = checkInputs(aDesign(), next, declarations)

    expectErr(result)
    expect(result.error).toEqual(inputRejection('p', 'colour', 'unknown'))
  })

  it("refuses a design part's input its blueprint does not declare, naming the part", () => {
    const next = aDesign({ parts: [aBlueprintDesignPart({ inputs: { colour: 'red' } })] })

    const result = checkInputs(aDesign(), next, declarations)

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'blueprint-input-invalid',
      ids: ['key'],
      message: blueprintInputInvalidMessage({
        owner: { scope: 'part', id: anId('key') },
        input: 'colour',
        reason: 'unknown',
      }),
    })
  })
})
