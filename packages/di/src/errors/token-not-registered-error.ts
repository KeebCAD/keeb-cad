import { tokenName } from '../token'

import type { AnyTokenLike } from '../types'

export class TokenNotRegisteredError extends Error {
  readonly tokenName: string
  readonly chain: readonly string[]

  constructor(token: AnyTokenLike, chain: readonly string[]) {
    const name = tokenName(token)
    super(
      `Token "${name}" is not registered. Resolution chain: [${chain.join(' -> ') || '(empty)'}]`,
    )
    this.name = 'TokenNotRegisteredError'
    this.tokenName = name
    this.chain = chain
  }
}
