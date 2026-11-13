import type { Id, Violation } from '@keeb-cad/schema'

import { unsupportedFormMessage } from './unsupported-form-message'

// No command changes an open design's form, so there is no fix to offer.
export function unsupportedFormViolation(designId: Id): Violation {
  const ids = [designId]
  return {
    kind: 'unsupported-form',
    severity: 'error',
    ids,
    message: unsupportedFormMessage(ids),
    fixes: [],
  }
}
