import { describe, expect, it } from 'vitest'

import { anchorCycle } from './anchor-cycle'

const graph = (entries: Record<string, string[]>) => new Map(Object.entries(entries))

describe('anchorCycle', () => {
  it('finds the loop through the second of two dependencies when the first closes none', () => {
    const dependencies = graph({ n: [], t: ['x', 'y'], x: [], y: ['n'] })

    expect(anchorCycle(dependencies, 'n', 't').getOrUndefined()).toEqual(['n', 't', 'y'])
  })
})
