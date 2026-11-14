import type { Form, Frozen, Group, Override, Violation } from '@keeb-cad/schema'

import { resolvesToSlot } from '../overrides/override-target'
import { isRefusedSwap } from '../overrides/refused-swap'
import { overrideNotAllowedMessage } from './override-not-allowed-message'
import { unresolvableReferenceMessage } from './unresolvable-reference-message'

// In the list's order. An override whose target doesn't resolve reports only that: the board is
// as if it were absent.
export function overrideViolations(
  overrides: Frozen<Override[]>,
  layout: Frozen<Group>,
  form: Frozen<Form>,
): Violation[] {
  return overrides.flatMap((override): Violation[] => {
    const ids = [override.target]
    if (!resolvesToSlot(layout, override.target)) {
      return [
        {
          kind: 'unresolvable-reference',
          severity: 'warning',
          ids,
          message: unresolvableReferenceMessage('override', ids),
          fixes: [],
        },
      ]
    }
    if (isRefusedSwap(override, form)) {
      return [
        {
          kind: 'override-not-allowed',
          severity: 'error',
          ids,
          message: overrideNotAllowedMessage(ids),
          fixes: [],
        },
      ]
    }
    return []
  })
}
