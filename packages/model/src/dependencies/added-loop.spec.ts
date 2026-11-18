import { describe, expect, it } from 'vitest'

import { addedLoop } from './added-loop'

const graph = (entries: Record<string, string[]>) => new Map(Object.entries(entries))

describe('addedLoop', () => {
  it('finds a loop through an added edge, listed from the item that gained it', () => {
    const was = graph({ a: ['b'], b: [] })
    const is = graph({ a: ['b'], b: ['a'] })

    expect(addedLoop(was, is).getOrUndefined()).toEqual(['b', 'a'])
  })

  it('finds no loop the earlier dependencies already held', () => {
    const looped = graph({ a: ['b'], b: ['a'] })

    expect(addedLoop(looped, looped).getOrUndefined()).toBeUndefined()
  })
})
