import {
  type BlueprintDeclaration,
  type BlueprintInputs,
  compareId,
  type Frozen,
} from '@keeb-cad/schema'
import * as v from 'valibot'

import { inputValueSchema } from './input-value-schema'
import type { BlueprintInputInvalid, InputOwner } from './types'

// Every fault in the owner's inputs, by input in compareId order.
export function inputFaults(
  declaration: BlueprintDeclaration,
  owner: InputOwner,
  inputs: Frozen<BlueprintInputs>,
): BlueprintInputInvalid[] {
  return Object.keys(inputs)
    .toSorted(compareId)
    .flatMap((input): BlueprintInputInvalid[] => {
      const declared = declaration.inputs[input]
      if (declared === undefined) return [{ owner, input, reason: 'unknown' }]
      if (owner.scope === 'slot' && declared.perSlot !== true) {
        return [{ owner, input, reason: 'not-per-slot' }]
      }
      // No quantity input is declared yet, so its unit and range rules are not settled.
      if (declared.kind === 'quantity') return []
      const value = inputs[input] as BlueprintInputs[string]
      return v.is(inputValueSchema(declared), value)
        ? []
        : [{ owner, input, reason: 'bad-value', value, expected: declared }]
    })
}
