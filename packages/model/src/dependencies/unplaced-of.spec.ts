import { describe, expect, it } from 'vitest'

import { unplacedOf } from './unplaced-of'

const graph = (entries: Record<string, string[]>) => new Map(Object.entries(entries))

describe('unplacedOf', () => {
  it('leaves nothing unplaced with no seeds', () => {
    expect(unplacedOf(graph({ a: [], b: ['a'] }), [])).toEqual(new Set())
  })

  it('leaves a seed and everything reading it, however indirectly, unplaced', () => {
    const dependencies = graph({ root: [], a: ['root'], b: ['a'], c: ['b'], d: ['root'] })

    expect(unplacedOf(dependencies, ['a'])).toEqual(new Set(['a', 'b', 'c']))
  })

  it('leaves an item unplaced when any one of its dependencies is', () => {
    const dependencies = graph({ a: [], b: [], c: ['a', 'b'] })

    expect(unplacedOf(dependencies, ['b'])).toEqual(new Set(['b', 'c']))
  })
})
