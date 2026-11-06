import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { chainGroupSchema, freeGroupSchema } from '../layout'
import { aChainGroup, aFreeGroup, aGroup, aLayout } from './layout'

describe('aFreeGroup', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(freeGroupSchema, aFreeGroup()).issues).toBeUndefined()
  })
})

describe('aChainGroup', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(chainGroupSchema, aChainGroup()).issues).toBeUndefined()
  })
})

describe('aGroup', () => {
  it.each([
    ['free', aFreeGroup],
    ['chain', aChainGroup],
  ] as const)('builds the %s branch with its branch builder', (arrangement, branchBuilder) => {
    expect(aGroup(arrangement)).toEqual(branchBuilder())
  })
})

describe('aLayout', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(freeGroupSchema, aLayout()).issues).toBeUndefined()
  })
})
