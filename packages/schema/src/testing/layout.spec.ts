import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { chainGroupSchema, freeGroupSchema, slotSchema } from '../layout'
import { anId } from './id'
import { aChainGroup, aFreeGroup, aGroup, aLayout, aSlot } from './layout'
import { anAngle } from './angle'
import { anOffset } from './offset'
import { aPartRef } from './part-ref'

describe('aSlot', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(slotSchema, aSlot()).issues).toBeUndefined()
  })

  it.each([
    ['id', () => ({ id: anId('other') })],
    ['part', () => ({ part: aPartRef('other') })],
    ['inputs', () => ({ inputs: { size: '1u' } })],
    ['offset', () => ({ offset: anOffset({ rotation: anAngle('15deg') }) })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aSlot(fields)).toMatchObject(fields)
  })
})

describe('aFreeGroup', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(freeGroupSchema, aFreeGroup()).issues).toBeUndefined()
  })

  it.each([
    ['id', () => ({ id: anId('other') })],
    ['children', () => ({ children: [aSlot()] })],
    ['defaultPart', () => ({ defaultPart: aPartRef('other') })],
    ['offset', () => ({ offset: anOffset({ rotation: anAngle('15deg') }) })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aFreeGroup(fields)).toMatchObject(fields)
  })
})

describe('aChainGroup', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(chainGroupSchema, aChainGroup()).issues).toBeUndefined()
  })

  it.each([
    ['id', () => ({ id: anId('other') })],
    ['axis', () => ({ axis: 'y' as const })],
    ['children', () => ({ children: [aSlot()] })],
    ['defaultPart', () => ({ defaultPart: aPartRef('other') })],
    ['offset', () => ({ offset: anOffset({ rotation: anAngle('15deg') }) })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aChainGroup(fields)).toMatchObject(fields)
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

  it.each([
    ['id', () => ({ id: anId('other') })],
    ['children', () => ({ children: [aSlot()] })],
    ['offset', () => ({ offset: anOffset({ rotation: anAngle('15deg') }) })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aLayout(fields)).toMatchObject(fields)
  })
})
