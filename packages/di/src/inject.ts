import { CircularDependencyError } from './errors/circular-dependency-error'
import { NoInjectionContextError } from './errors/no-injection-context-error'
import { tokenName } from './token'

import type { AnyTokenLike, MultiToken, Resolver, Token, TokenLike } from './types'

// The injection context lives at module level, not in a service: inject() runs in field
// initialisers with no handle on anything, and the container that would hold it is what this
// context builds.
const resolverStack: Resolver[] = []
const chain: AnyTokenLike[] = []

export function inject<T>(token: TokenLike<T>): T
export function inject<T>(token: MultiToken<T>): T[]
export function inject(token: AnyTokenLike): unknown {
  const resolver = resolverStack.at(-1)
  if (!resolver) {
    throw new NoInjectionContextError(`inject(${tokenName(token)})`)
  }
  return resolver.resolve(token as Token<unknown>)
}

export function withResolutionContext<T>(
  resolver: Resolver,
  token: AnyTokenLike,
  callback: () => T,
): T {
  if (chain.includes(token)) {
    throw new CircularDependencyError([...chain, token].map((t) => tokenName(t)))
  }
  resolverStack.push(resolver)
  chain.push(token)
  try {
    return callback()
  } finally {
    chain.pop()
    resolverStack.pop()
  }
}

export function currentChain(): readonly string[] {
  return chain.map((t) => tokenName(t))
}

export function currentResolver(): Resolver | undefined {
  return resolverStack.at(-1)
}
