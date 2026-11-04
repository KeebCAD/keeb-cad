import { MULTI_TOKEN_BRAND, TOKEN_BRAND } from './token-brands'

import type { AnyTokenLike, MultiToken, Token, TokenKind } from './types'

export function createToken<T>(name: string): Token<T> {
  return { [TOKEN_BRAND]: true, name }
}

export function createMultiToken<T>(name: string): MultiToken<T> {
  return { [MULTI_TOKEN_BRAND]: true, name }
}

export function isToken(value: unknown): value is AnyTokenLike {
  if (typeof value === 'function') {
    return isClassConstructor(value)
  }
  if (typeof value !== 'object' || value === null) return false
  return Object.hasOwn(value, TOKEN_BRAND) || Object.hasOwn(value, MULTI_TOKEN_BRAND)
}

export function tokenKind(token: AnyTokenLike): TokenKind {
  if (typeof token === 'function') return 'single'
  if (Object.hasOwn(token, MULTI_TOKEN_BRAND)) return 'multi'
  return 'single'
}

export function tokenName(token: AnyTokenLike): string {
  return typeof token === 'function' ? token.name || 'anonymous-class' : token.name
}

function isClassConstructor(value: unknown): boolean {
  return Function.prototype.toString.call(value).startsWith('class')
}
