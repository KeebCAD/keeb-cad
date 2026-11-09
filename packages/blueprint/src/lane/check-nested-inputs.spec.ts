import { describe, expect, it } from 'vitest'

import { checkNestedInputs } from './check-nested-inputs'
import type { NestedBlueprintDeclaration } from './types'
import { errOf, okOf, outcomeOf } from '../testing/outcome'

const blueprint: NestedBlueprintDeclaration = {
  id: 'lib:blueprint/screw',
  inputs: {
    width: { kind: 'quantity', default: { type: 'quantity', value: '19mm' } },
    finish: { kind: 'option', options: ['matte', 'gloss'], default: 'matte' },
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

  it('names an omitted input whose default does not parse', () => {
    const broken: NestedBlueprintDeclaration = {
      id: blueprint.id,
      inputs: { width: { kind: 'quantity', default: { type: 'quantity', value: 'wide' } } },
    }
    expect(outcomeOf(checkNestedInputs(broken, {}))).toEqual(nestedFailed('width'))
  })

  it('refuses inputs that are not an object', () => {
    expect(outcomeOf(checkNestedInputs(blueprint, 5))).toEqual(nestedFailed('(inputs)'))
  })
})
