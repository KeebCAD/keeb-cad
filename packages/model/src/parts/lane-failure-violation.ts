import type { LaneFailure } from '@keeb-cad/blueprint'
import { compareCodeUnits, type ItemId, type Violation } from '@keeb-cad/schema'

import { partViolationMessage } from './part-violation-message'
import type { PartRun } from './types'

export function laneFailureViolation(
  run: PartRun,
  error: Exclude<LaneFailure, { kind: 'unavailable' }>,
): Violation {
  const ids: ItemId[] = [run.part, ...run.slots.toSorted(compareCodeUnits)]
  return {
    kind: error.kind,
    severity: 'error',
    ids,
    message: partViolationMessage(error, ids),
    fixes: [],
  }
}
