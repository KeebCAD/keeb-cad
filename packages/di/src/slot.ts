import { disposeInstance } from './disposal'
import { withResolutionContext } from './inject'

import type { AnyTokenLike, Resolver } from './types'

export class Slot {
  #value: unknown
  #has = false

  get has(): boolean {
    return this.#has
  }

  getOrCreate(resolver: Resolver, token: AnyTokenLike, factory: () => unknown): unknown {
    if (this.#has) return this.#value
    this.#value = withResolutionContext(resolver, token, factory)
    this.#has = true
    return this.#value
  }

  async dispose(): Promise<void> {
    if (!this.#has) return
    const value = this.#value
    this.#value = undefined
    this.#has = false
    await disposeInstance(value)
  }
}
