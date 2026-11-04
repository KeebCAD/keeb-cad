import { tokenName } from '../token'

import type { AnyTokenLike } from '../types'

export class DuplicateRegistrationError extends Error {
  readonly tokenName: string

  constructor(token: AnyTokenLike) {
    const name = tokenName(token)
    super(
      `Token "${name}" already has a single-binding registration. Use createMultiToken for multi-binding semantics.`,
    )
    this.name = 'DuplicateRegistrationError'
    this.tokenName = name
  }
}
