import { Result } from '@keeb-cad/result'
import {
  compareId,
  type Design,
  type Frozen,
  type LibraryData,
  type Rejection,
} from '@keeb-cad/schema'

import { slotPartRuns } from '../part-levels/slot-part-runs'
import { reject } from '../reject/reject'
import { blueprintInputInvalidMessage } from '../violations/blueprint-input-invalid-message'
import { designFaults } from './design-faults'
import type { BlueprintInputInvalid } from './types'

// Refuses only a fault the edit introduced, so an input a loaded file already broke blocks no
// unrelated edit. Of several new faults, the one whose owner, then input, is lowest by compareId.
export function checkInputs(
  previous: Frozen<Design>,
  next: Frozen<Design>,
  declarations: LibraryData['declarations'],
): Result<void, Rejection> {
  const before = new Set(faultsOf(previous, declarations).map(faultKey))
  const [first] = faultsOf(next, declarations)
    .filter((fault) => !before.has(faultKey(fault)))
    .toSorted((a, b) => compareId(a.owner.id, b.owner.id) || compareId(a.input, b.input))
  return first === undefined
    ? Result.ok()
    : Result.err(
        reject('blueprint-input-invalid', [first.owner.id], blueprintInputInvalidMessage(first)),
      )
}

function faultsOf(
  design: Frozen<Design>,
  declarations: LibraryData['declarations'],
): BlueprintInputInvalid[] {
  const lookups = { parts: design.parts, libraryVersions: design.libraryVersions, declarations }
  return designFaults(lookups, slotPartRuns(design.layout, design.meta.defaultPart))
}

function faultKey({ owner, input, reason }: BlueprintInputInvalid): string {
  return `${owner.scope} ${owner.id} ${input} ${reason}`
}
