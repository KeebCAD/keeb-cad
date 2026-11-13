import type { PlainInput } from '@keeb-cad/schema'
import { anId, anOptionInput, aQuantityInputValue } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import type { BlueprintInputInvalid, InputOwner } from '../inputs/types'
import { blueprintInputInvalidMessage } from './blueprint-input-invalid-message'

const size = anOptionInput({ options: ['1u', '1.5u'], default: '1u', perSlot: true })
const flip: PlainInput = { kind: 'boolean', label: 'Flip', default: false, perSlot: true }
const legend: PlainInput = { kind: 'text', label: 'Legend', default: '' }

const slot: InputOwner = { scope: 'slot', id: anId('s') }
const part: InputOwner = { scope: 'part', id: anId('p') }

describe('blueprintInputInvalidMessage', () => {
  it.each<[string, BlueprintInputInvalid, string]>([
    [
      "a slot's unknown input",
      { owner: slot, input: 'colour', reason: 'unknown' },
      `The slot "s" sets "colour", an input its part's blueprint doesn't declare.`,
    ],
    [
      "a slot's input not marked per-slot",
      { owner: slot, input: 'legend', reason: 'not-per-slot' },
      `The slot "s" sets "legend", which its part's blueprint doesn't let a slot change.`,
    ],
    [
      'text outside the options',
      { owner: slot, input: 'size', reason: 'bad-value', value: '2u', expected: size },
      `The slot "s" sets "size" to "2u", which isn't one of 1u, 1.5u.`,
    ],
    [
      'a boolean given to an option',
      { owner: slot, input: 'size', reason: 'bad-value', value: true, expected: size },
      `The slot "s" sets "size" to true, which isn't one of 1u, 1.5u.`,
    ],
    [
      'a quantity given to an option',
      {
        owner: slot,
        input: 'size',
        reason: 'bad-value',
        value: aQuantityInputValue('5mm'),
        expected: size,
      },
      `The slot "s" sets "size" to 5mm, which isn't one of 1u, 1.5u.`,
    ],
    [
      'text given to a boolean',
      { owner: slot, input: 'flip', reason: 'bad-value', value: 'yes', expected: flip },
      `The slot "s" sets "flip" to "yes", which isn't true or false.`,
    ],
    [
      'a boolean given to text',
      { owner: slot, input: 'legend', reason: 'bad-value', value: true, expected: legend },
      `The slot "s" sets "legend" to true, which isn't text.`,
    ],
    [
      "a part's unknown input",
      { owner: part, input: 'colour', reason: 'unknown' },
      `The part "p" sets "colour", an input its blueprint doesn't declare.`,
    ],
    [
      "a part's option outside the list",
      { owner: part, input: 'size', reason: 'bad-value', value: '2u', expected: size },
      `The part "p" sets "size" to "2u", which isn't one of 1u, 1.5u.`,
    ],
  ])('words %s', (_role, invalid, expected) => {
    expect(blueprintInputInvalidMessage(invalid)).toBe(expected)
  })
})
