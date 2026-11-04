import { match } from 'ts-pattern'

import { disposeSlots } from './disposal'
import { ContainerDisposedError } from './errors/container-disposed-error'
import { TokenNotRegisteredError } from './errors/token-not-registered-error'
import { currentChain, withResolutionContext } from './inject'
import { Lifetime } from './lifetime'
import { Slot } from './slot'
import { tokenKind } from './token'

import type { Bindings } from './bindings'
import type { StoredEntry } from './stored-entry'
import type { AnyTokenLike, MultiToken, Resolver, TokenLike } from './types'

export class Scope implements Resolver {
  readonly #bindings: Bindings
  readonly #scopedSlots = new Map<StoredEntry, Slot>()
  readonly #scopedOrder: Slot[] = []
  #disposed = false

  constructor(bindings: Bindings) {
    this.#bindings = bindings
  }

  resolve<T>(token: TokenLike<T>): T
  resolve<T>(token: MultiToken<T>): T[]
  resolve(token: AnyTokenLike): unknown {
    this.#ensureNotDisposed()
    const entries = this.#bindings.lookup(token)
    const first = entries?.[0]
    if (!entries || !first) {
      throw new TokenNotRegisteredError(token, currentChain())
    }
    return match(tokenKind(token))
      .with('single', () => this.#resolveSingle(token, first))
      .with('multi', () => entries.map((stored) => this.#resolveSingle(token, stored)))
      .exhaustive()
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return
    this.#disposed = true
    const slots = this.#scopedOrder.toReversed()
    this.#scopedSlots.clear()
    this.#scopedOrder.length = 0
    const errors = await disposeSlots(slots)
    if (errors.length > 0) {
      throw new AggregateError(errors, 'One or more scope disposers failed.')
    }
  }

  #resolveSingle(token: AnyTokenLike, stored: StoredEntry): unknown {
    return match(stored.entry.lifetime)
      .with(Lifetime.Container, () => stored.slot.getOrCreate(this, token, stored.entry.factory))
      .with(Lifetime.Transient, () => withResolutionContext(this, token, stored.entry.factory))
      .with(Lifetime.Scoped, () =>
        this.#scopedSlotFor(stored).getOrCreate(this, token, stored.entry.factory),
      )
      .exhaustive()
  }

  #scopedSlotFor(stored: StoredEntry): Slot {
    let slot = this.#scopedSlots.get(stored)
    if (!slot) {
      slot = new Slot()
      this.#scopedSlots.set(stored, slot)
      this.#scopedOrder.push(slot)
    }
    return slot
  }

  #ensureNotDisposed(): void {
    if (this.#disposed) throw new ContainerDisposedError()
  }
}
