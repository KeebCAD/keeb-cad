import { describe, expect, it } from 'vitest'

import { LaneCache } from './lane-cache'
import type { CachedLaneResult } from './types'

const CAPACITY = 500
const value: CachedLaneResult = { ok: { outputs: {}, problems: [] } }
const keyAt = (index: number) => `key-${String(index)}`

function arrange(entries: number) {
  const cache = new LaneCache()
  for (let index = 0; index < entries; index += 1) cache.set(keyAt(index), value)
  return cache
}

describe('LaneCache', () => {
  it('stores a new key in an empty cache', () => {
    const cache = arrange(0)

    cache.set('new', value)

    expect(cache.get('new').isSome()).toBe(true)
  })

  it('evicts nothing just below capacity', () => {
    const cache = arrange(CAPACITY - 1)

    cache.set('new', value)

    expect(cache.size).toBe(CAPACITY)
    expect(cache.get(keyAt(0)).isSome()).toBe(true)
  })

  it('evicts the least recently used on capacity', () => {
    const cache = arrange(CAPACITY)

    cache.set('new', value)

    expect(cache.size).toBe(CAPACITY)
    expect(cache.get(keyAt(0)).isSome()).toBe(false)
    expect(cache.get(keyAt(1)).isSome()).toBe(true)
  })

  it('keeps an entry just read and evicts the next oldest', () => {
    const cache = arrange(CAPACITY)
    cache.get(keyAt(0))

    cache.set('new', value)

    expect(cache.get(keyAt(0)).isSome()).toBe(true)
    expect(cache.get(keyAt(1)).isSome()).toBe(false)
  })
})
