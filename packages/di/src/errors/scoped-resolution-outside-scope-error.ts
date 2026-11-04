import { tokenName } from '../token'

import type { AnyTokenLike } from '../types'

export class ScopedResolutionOutsideScopeError extends Error {
  readonly tokenName: string

  constructor(token: AnyTokenLike) {
    const name = tokenName(token)
    super(
      `Scoped token "${name}" cannot be resolved from the root container. Create a scope first.`,
    )
    this.name = 'ScopedResolutionOutsideScopeError'
    this.tokenName = name
  }
}
