import type { Id, Violation } from '@keeb-cad/schema'

import { partViolationMessage } from './part-violation-message'

export function unresolvedViolation(slot: Id, severity: 'warning' | 'error'): Violation {
  const ids = [slot]
  return {
    kind: 'unresolvable-reference',
    severity,
    ids,
    message: partViolationMessage({ kind: 'unresolvable-reference' }, ids),
    fixes: [],
  }
}
