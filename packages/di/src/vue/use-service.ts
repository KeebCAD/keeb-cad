import { useInjector } from './use-injector'

import type { MultiToken, TokenLike } from '../types'

export function useService<T>(token: TokenLike<T>): T
export function useService<T>(token: MultiToken<T>): T[]
export function useService<T>(token: TokenLike<T> | MultiToken<T>): T | T[] {
  return useInjector().resolve(token as TokenLike<T>)
}
