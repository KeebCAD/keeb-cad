import type { Injector, MultiToken, Resolver, TokenLike } from './types'

export function createInjector(resolver: Resolver): Injector {
  return {
    resolve<T>(token: TokenLike<T> | MultiToken<T>): T | T[] {
      return resolver.resolve(token as TokenLike<T>)
    },
  }
}
