import { aQuantityInput, aQuantityInputValue, anOptionInput } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { checkNestedInputs } from './check-nested-inputs'
import type { NestedBlueprintDeclaration } from './types'
import { errOf, okOf, outcomeOf } from '../testing/outcome'

const blueprint: NestedBlueprintDeclaration = {
  id: 'lib:blueprint/screw',
  inputs: {
    width: aQuantityInput({ default: aQuantityInputValue('19mm') }),
    finish: anOptionInput({ options: ['matte', 'gloss'], default: 'matte' }),
  },
}
const nestedFailed = (input: string) =>
  errOf({ kind: 'lane-failed', cause: 'nested-input', blueprint: blueprint.id, input })

describe('checkNestedInputs', () => {
  it('takes the declared default for an omitted input, as the plain value a lane receives', () => {
    expect(outcomeOf(checkNestedInputs(blueprint, { finish: 'gloss' }))).toEqual(
      okOf({ width: 19, finish: 'gloss' }),
    )
  })

  it('names an unknown input', () => {
    expect(outcomeOf(checkNestedInputs(blueprint, { depth: 3 }))).toEqual(nestedFailed('depth'))
  })

  it.each([
    ['a quantity given text', 'width', { width: '5' }],
    ['an option outside its list', 'finish', { finish: 'raw' }],
  ])('names %s', (_role, name, given) => {
    expect(outcomeOf(checkNestedInputs(blueprint, given))).toEqual(nestedFailed(name))
  })

  it.each(['part', 'anchor', 'asset'] as const)(
    'names an omitted %s input, whose default cannot reach a lane as a handle',
    (kind) => {
      const refs: NestedBlueprintDeclaration = {
        id: blueprint.id,
        inputs: { ref: { kind, default: { type: kind } } },
      }
      expect(outcomeOf(checkNestedInputs(refs, {}))).toEqual(nestedFailed('ref'))
    },
  )

  it.each([
    ['an expression', '2 * 3mm', okOf({ width: 6, finish: 'matte' })],
    ['a name it cannot resolve', 'w', nestedFailed('width')],
  ])('evaluates an omitted quantity default that is %s', (_role, text, expected) => {
    const withDefault: NestedBlueprintDeclaration = {
      id: blueprint.id,
      inputs: {
        ...blueprint.inputs,
        width: aQuantityInput({ default: aQuantityInputValue(text) }),
      },
    }

    expect(outcomeOf(checkNestedInputs(withDefault, {}))).toEqual(expected)
  })

  it('refuses inputs that are not an object', () => {
    expect(outcomeOf(checkNestedInputs(blueprint, 5))).toEqual(nestedFailed('(inputs)'))
  })
})
