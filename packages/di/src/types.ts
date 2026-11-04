import type { Container } from './container'
import type { Lifetime } from './lifetime'
import type { MULTI_TOKEN_BRAND, TOKEN_BRAND } from './token-brands'

export interface Token<T> {
  readonly [TOKEN_BRAND]: true
  readonly name: string
  readonly __type?: T
}

export interface MultiToken<T> {
  readonly [MULTI_TOKEN_BRAND]: true
  readonly name: string
  readonly __type?: T
}

export type Class<T> = new (...arguments_: never[]) => T

export type TokenLike<T> = Token<T> | Class<T>

export type AnyTokenLike = Token<unknown> | MultiToken<unknown> | Class<unknown>

export type TokenKind = 'single' | 'multi'

export interface Resolver {
  resolve<T>(token: TokenLike<T>): T
  resolve<T>(token: MultiToken<T>): T[]
}

export interface Injector {
  resolve<T>(token: TokenLike<T>): T
  resolve<T>(token: MultiToken<T>): T[]
}

export interface Module {
  register(c: Container): void
}

export interface RegistrationEntry<T> {
  readonly factory: () => T
  readonly lifetime: Lifetime
  readonly eager: boolean
}

export type OnRegistrationChange<T> = (entry: RegistrationEntry<T>) => void

export interface RegistrationDefaults {
  readonly lifetime: Lifetime
  readonly eager: boolean
}
