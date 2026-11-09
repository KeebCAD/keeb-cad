import { Option } from '@keeb-cad/result'

import type { CachedLaneResult } from './types'

const CAPACITY = 500

export class LaneCache {
  get size(): number {
    return this.#entries.size
  }

  get(key: string): Option<CachedLaneResult> {
    const entry = this.#entries.get(key)
    if (entry === undefined) return Option.none()
    this.#entries.delete(key)
    this.#entries.set(key, entry)
    return Option.some(entry)
  }

  set(key: string, result: CachedLaneResult): void {
    this.#entries.delete(key)
    this.#entries.set(key, result)
    if (this.#entries.size <= CAPACITY) return
    const oldest = this.#entries.keys().next()
    if (!oldest.done) this.#entries.delete(oldest.value)
  }

  // Map iterates in insertion order, so re-inserting on read keeps the least recently used first.
  readonly #entries = new Map<string, CachedLaneResult>()
}
