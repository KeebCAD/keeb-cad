import type { ItemId } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

import type { ExpressionFault } from '../evaluation/types'
import { divisionByZeroMessage } from './division-by-zero-message'
import { negativeLengthMessage } from './negative-length-message'
import { unitMismatchMessage } from './unit-mismatch-message'
import { unresolvableReferenceMessage } from './unresolvable-reference-message'

// The message of the kind an expression fails with; a rejection and a violation share it.
export function expressionFaultMessage(fault: ExpressionFault, ids: readonly ItemId[]): string {
  return match(fault.kind)
    .with('unit-mismatch', () => unitMismatchMessage(ids))
    .with('division-by-zero', () => divisionByZeroMessage(ids))
    .with('negative-length', () => negativeLengthMessage(ids))
    .with('unresolvable-reference', () =>
      unresolvableReferenceMessage({ parameter: fault.name ?? '' }, ids),
    )
    .exhaustive()
}
