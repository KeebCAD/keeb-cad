import type { Violation } from '@keeb-cad/schema'

import type { BlueprintInputInvalid } from '../inputs/types'
import { partViolationMessage } from './part-violation-message'

export function inputInvalidViolation(invalid: BlueprintInputInvalid): Violation {
  return {
    kind: 'blueprint-input-invalid',
    severity: 'error',
    ids: [invalid.owner.id],
    message: partViolationMessage({ kind: 'blueprint-input-invalid', invalid }, [invalid.owner.id]),
    fixes: [],
  }
}
