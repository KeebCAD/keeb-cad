import { match } from 'ts-pattern'

import { Bindings } from './bindings'
import { createInjector } from './create-injector'
import { disposeSlots } from './disposal'
import { CannotOverrideError } from './errors/cannot-override-error'
import { ContainerDisposedError } from './errors/container-disposed-error'
import { InvalidTokenError } from './errors/invalid-token-error'
import { ScopedResolutionOutsideScopeError } from './errors/scoped-resolution-outside-scope-error'
import { TokenNotRegisteredError } from './errors/token-not-registered-error'
import { currentChain, currentResolver, withResolutionContext } from './inject'
import { InjectorToken } from './injector-token'
import { Lifetime } from './lifetime'
import { RegistrationBuilder } from './registration-builder'
import { Scope } from './scope'
import { isToken, tokenKind } from './token'

import type { StoredEntry } from './stored-entry'
import type { AnyTokenLike, Module, MultiToken, Resolver, TokenLike } from './types'

export class Container implements Resolver {
  readonly #bindings = new Bindings()
  #disposed = false

  constructor() {
    this.#registerBuiltins()
  }

  register<T>(token: TokenLike<T> | MultiToken<T>): RegistrationBuilder<T>
  register<T>(token: AnyTokenLike): RegistrationBuilder<T> {
    this.#ensureNotDisposed()
    if (!isToken(token)) throw new InvalidTokenError(token)
    let stored: StoredEntry | undefined
    return new RegistrationBuilder<T>((entry) => {
      if (stored) {
        stored.entry = entry
        return
      }
      stored = this.#bindings.commit(token, entry)
    })
  }

  override<T>(token: TokenLike<T> | MultiToken<T>): RegistrationBuilder<T>
  override<T>(token: AnyTokenLike): RegistrationBuilder<T> {
    this.#ensureNotDisposed()
    if (!isToken(token)) throw new InvalidTokenError(token)
    if (tokenKind(token) !== 'single') throw new CannotOverrideError(token, 'multi')
    const stored = this.#bindings.lookup(token)?.at(0)
    if (!stored) throw new CannotOverrideError(token, 'unregistered')
    if (stored.entry.lifetime === Lifetime.Scoped) throw new CannotOverrideError(token, 'scoped')
    // Container-lifetime instances are memoized in the slot, so replacing the entry after a
    // resolve would silently keep the old instance. Refusing is safe: overrides run before
    // autoLoad(), which is when eager bindings first resolve.
    if (stored.slot.has) throw new CannotOverrideError(token, 'resolved')
    const { lifetime, eager } = stored.entry
    return new RegistrationBuilder<T>(
      (entry) => {
        stored.entry = entry
      },
      { lifetime, eager },
    )
  }

  resolve<T>(token: TokenLike<T>): T
  resolve<T>(token: MultiToken<T>): T[]
  resolve(token: AnyTokenLike): unknown {
    this.#ensureNotDisposed()
    const entries = this.#bindings.lookup(token)
    const first = entries?.[0]
    const kind = tokenKind(token)
    if (!entries || !first) {
      if (kind === 'multi') return []
      throw new TokenNotRegisteredError(token, currentChain())
    }
    return match(kind)
      .with('single', () => this.#resolveSingle(token, first))
      .with('multi', () => entries.map((stored) => this.#resolveSingle(token, stored)))
      .exhaustive()
  }

  createScope(): Scope {
    this.#ensureNotDisposed()
    return new Scope(this.#bindings)
  }

  async autoLoad(): Promise<void> {
    this.#ensureNotDisposed()
    const ordered = this.#bindings
      .all()
      .filter(({ stored }) => stored.entry.eager && !stored.slot.has)
      .toSorted((a, b) => a.stored.registrationIndex - b.stored.registrationIndex)
    for (const { token, stored } of ordered) {
      this.#resolveSingle(token, stored)
    }
  }

  addModule(module: Module): this {
    this.#ensureNotDisposed()
    module.register(this)
    return this
  }

  addModules(modules: readonly Module[]): this {
    for (const moduleEntry of modules) this.addModule(moduleEntry)
    return this
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return
    this.#disposed = true
    const slots = this.#bindings
      .all()
      .filter(({ stored }) => stored.slot.has)
      .toSorted((a, b) => b.stored.registrationIndex - a.stored.registrationIndex)
      .map(({ stored }) => stored.slot)
    const errors = await disposeSlots(slots)
    this.#bindings.clear()
    if (errors.length > 0) {
      throw new AggregateError(errors, 'One or more disposers failed.')
    }
  }

  #registerBuiltins(): void {
    this.register(InjectorToken)
      .useFactory(() => {
        const resolver = currentResolver() ?? this
        return createInjector(resolver)
      })
      .lifetime(Lifetime.Transient)
  }

  #resolveSingle(token: AnyTokenLike, stored: StoredEntry): unknown {
    return match(stored.entry.lifetime)
      .with(Lifetime.Container, () => stored.slot.getOrCreate(this, token, stored.entry.factory))
      .with(Lifetime.Transient, () => withResolutionContext(this, token, stored.entry.factory))
      .with(Lifetime.Scoped, () => {
        throw new ScopedResolutionOutsideScopeError(token)
      })
      .exhaustive()
  }

  #ensureNotDisposed(): void {
    if (this.#disposed) throw new ContainerDisposedError()
  }
}
