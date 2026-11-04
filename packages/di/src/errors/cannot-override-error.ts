import { tokenName } from '../token'
import { OVERRIDE_MESSAGES } from './override-messages'

import type { AnyTokenLike } from '../types'
import type { CannotOverrideReason } from './types'

export class CannotOverrideError extends Error {
  readonly tokenName: string
  readonly reason: CannotOverrideReason

  constructor(token: AnyTokenLike, reason: CannotOverrideReason) {
    const name = tokenName(token)
    super(OVERRIDE_MESSAGES[reason](name))
    this.name = 'CannotOverrideError'
    this.tokenName = name
    this.reason = reason
  }
}
