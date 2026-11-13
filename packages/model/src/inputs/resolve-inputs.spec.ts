import { expectResult } from '@keeb-cad/result/testing'
import { Result } from '@keeb-cad/result'
import type { BlueprintInputs, PlainInput } from '@keeb-cad/schema'
import {
  aBlueprintDeclaration,
  anId,
  anOptionInput,
  aQuantityInputValue,
} from '@keeb-cad/schema/testing'
import { describe, it } from 'vitest'

import { resolveInputs } from './resolve-inputs'
import type { BlueprintInputInvalid, InputOwner } from './types'

const size = anOptionInput({ options: ['1u', '1.5u'], default: '1u', perSlot: true })
const legend: PlainInput = { kind: 'text', label: 'Legend', default: '' }
const flip: PlainInput = { kind: 'boolean', label: 'Flip', default: false, perSlot: true }
const declaration = aBlueprintDeclaration({ inputs: { size, legend, flip } })

const part: InputOwner = { scope: 'part', id: anId('key') }
const slot: InputOwner = { scope: 'slot', id: anId('s') }

describe('resolveInputs', () => {
  it('lays nothing over the declared defaults', () => {
    expectResult(
      resolveInputs(declaration, part, {}),
      Result.ok({ size: '1u', legend: '', flip: false }),
    )
  })

  it("lays a part's inputs over the declared defaults", () => {
    expectResult(
      resolveInputs(declaration, part, { size: '1.5u' }),
      Result.ok({ size: '1.5u', legend: '', flip: false }),
    )
  })

  it("lays a slot's inputs over its part's", () => {
    const partInputs = { size: '1u', legend: 'k', flip: false }

    expectResult(
      resolveInputs(declaration, slot, { size: '1.5u' }, partInputs),
      Result.ok({ size: '1.5u', legend: 'k', flip: false }),
    )
  })

  describe("a slot's faults, each naming the slot and the input", () => {
    it.each<[string, BlueprintInputs, BlueprintInputInvalid]>([
      [
        'an input the blueprint does not declare',
        { colour: 'red' },
        { owner: slot, input: 'colour', reason: 'unknown' },
      ],
      [
        'an option outside the list',
        { size: '2u' },
        { owner: slot, input: 'size', reason: 'bad-value', value: '2u', expected: size },
      ],
      [
        'a boolean to an option',
        { size: true },
        { owner: slot, input: 'size', reason: 'bad-value', value: true, expected: size },
      ],
      [
        'an input not marked per-slot',
        { legend: 'x' },
        { owner: slot, input: 'legend', reason: 'not-per-slot' },
      ],
      [
        'text to a boolean',
        { flip: 'yes' },
        { owner: slot, input: 'flip', reason: 'bad-value', value: 'yes', expected: flip },
      ],
      [
        'a quantity to an option',
        { size: aQuantityInputValue('5mm') },
        {
          owner: slot,
          input: 'size',
          reason: 'bad-value',
          value: aQuantityInputValue('5mm'),
          expected: size,
        },
      ],
    ])('refuses %s', (_role, inputs, expected) => {
      expectResult(resolveInputs(declaration, slot, inputs), Result.err(expected))
    })
  })

  describe("a part's inputs, with no per-slot rule", () => {
    it.each<[string, BlueprintInputs, BlueprintInputInvalid]>([
      [
        'an input the blueprint does not declare',
        { colour: 'red' },
        { owner: part, input: 'colour', reason: 'unknown' },
      ],
      [
        'an option outside the list',
        { size: '2u' },
        { owner: part, input: 'size', reason: 'bad-value', value: '2u', expected: size },
      ],
    ])('refuses %s, naming the part', (_role, inputs, expected) => {
      expectResult(resolveInputs(declaration, part, inputs), Result.err(expected))
    })

    it('takes an input not marked per-slot', () => {
      expectResult(
        resolveInputs(declaration, part, { legend: 'x' }),
        Result.ok({ size: '1u', legend: 'x', flip: false }),
      )
    })
  })

  it('names the faulty input lowest by compareId', () => {
    expectResult(
      resolveInputs(declaration, slot, { size: '2u', colour: 'red' }),
      Result.err({ owner: slot, input: 'colour', reason: 'unknown' }),
    )
  })
})
