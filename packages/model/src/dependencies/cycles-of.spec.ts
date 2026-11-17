import { describe, expect, it } from 'vitest'

import { cyclesOf } from './cycles-of'

const graph = (entries: Record<string, string[]>) => new Map(Object.entries(entries))

describe('cyclesOf', () => {
  it('finds nothing where nothing loops', () => {
    expect(cyclesOf(graph({ a: ['b', 'c'], b: ['c'], c: [] }))).toEqual([])
  })

  it('lists a loop through an item with two dependencies, from its lowest member', () => {
    expect(cyclesOf(graph({ c: ['x', 'a'], a: ['b'], b: ['c'], x: [] }))).toEqual([['a', 'b', 'c']])
  })

  it('lists an item on itself as a loop of one', () => {
    expect(cyclesOf(graph({ a: ['a'] }))).toEqual([['a']])
  })

  it('follows no dependency on an item the map lacks', () => {
    expect(cyclesOf(graph({ a: ['missing'] }))).toEqual([])
  })

  it('lists two separate loops sorted by their lowest members', () => {
    expect(cyclesOf(graph({ q: ['p'], p: ['q'], b: ['a'], a: ['b'] }))).toEqual([
      ['a', 'b'],
      ['p', 'q'],
    ])
  })
})
