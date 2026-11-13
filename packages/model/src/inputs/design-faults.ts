import type { PartRef } from '@keeb-cad/schema'

import { resolvePartRef } from '../part-levels/resolve-part-ref'
import type { PartLookups, SlotPartRun } from '../part-levels/types'
import { inputFaults } from './input-faults'
import type { BlueprintInputInvalid } from './types'

// A design part is checked against its pinned declaration; a slot against its first level that
// resolves, and not at all when none does. Parts first, then slots, each owner's by input.
export function designFaults(
  lookups: PartLookups,
  slotRuns: readonly SlotPartRun[],
): BlueprintInputInvalid[] {
  const partFaults = lookups.parts.flatMap((part) => {
    const resolution = resolvePartRef(part.id as PartRef, lookups)
    return resolution.kind === 'found'
      ? inputFaults(resolution.declaration, { scope: 'part', id: part.id }, resolution.part.inputs)
      : []
  })
  const slotFaults = slotRuns.flatMap((run) => {
    const resolution = run.levels
      .map((level) => resolvePartRef(level, lookups))
      .find(({ kind }) => kind === 'found')
    return resolution?.kind === 'found'
      ? inputFaults(resolution.declaration, { scope: 'slot', id: run.slot }, run.inputs)
      : []
  })
  return [...partFaults, ...slotFaults]
}
