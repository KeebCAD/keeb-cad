import { Result } from '@keeb-cad/result'
import type { BlueprintDeclaration, BlueprintInputs, Frozen } from '@keeb-cad/schema'

import { inputFaults } from './input-faults'
import type { BlueprintInputInvalid, InputOwner } from './types'

// The owner's inputs laid over `under`: the declared defaults, or for a slot the inputs its part
// resolved to. A fault names the owner's input lowest by compareId.
export function resolveInputs(
  declaration: BlueprintDeclaration,
  owner: InputOwner,
  inputs: Frozen<BlueprintInputs>,
  under: Frozen<BlueprintInputs> = declaredDefaults(declaration),
): Result<Frozen<BlueprintInputs>, BlueprintInputInvalid> {
  const [fault] = inputFaults(declaration, owner, inputs)
  return fault === undefined ? Result.ok({ ...under, ...inputs }) : Result.err(fault)
}

function declaredDefaults(declaration: BlueprintDeclaration): Frozen<BlueprintInputs> {
  return Object.fromEntries(
    Object.entries(declaration.inputs).map(([name, declared]) => [name, declared.default]),
  )
}
