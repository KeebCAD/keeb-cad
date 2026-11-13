import type { Violation } from '@keeb-cad/schema'

import type { AnchorCheck } from '../dependencies/types'
import { dependencyCycleMessage } from './dependency-cycle-message'
import { unresolvableReferenceMessage } from './unresolvable-reference-message'

// Cycles, then unresolvable anchors, each already in compareId order of its first id.
export function layoutViolations({ cycles, unresolvable }: AnchorCheck): Violation[] {
  return [
    ...cycles.map((ids): Violation => ({
      kind: 'dependency-cycle',
      severity: 'error',
      ids,
      message: dependencyCycleMessage(ids),
      fixes: [],
    })),
    ...unresolvable.map((id): Violation => {
      const ids = [id]
      return {
        kind: 'unresolvable-reference',
        severity: 'error',
        ids,
        message: unresolvableReferenceMessage('anchor', ids),
        fixes: [],
      }
    }),
  ]
}
