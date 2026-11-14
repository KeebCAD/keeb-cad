import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { overrideSchema, sideComponentOverrideSchema, sidePartOverrideSchema } from '../override'
import { aSideComponentOverride, anOverride, aSidePartOverride } from './override'
import { aPartRef } from './part-ref'
import { aSideId } from './side-id'

describe('aSidePartOverride', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(sidePartOverrideSchema, aSidePartOverride()).issues).toBeUndefined()
  })

  it.each([
    ['target', () => ({ target: aSideId('left/other') })],
    ['part', () => ({ part: aPartRef('other') })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aSidePartOverride(fields)).toMatchObject(fields)
  })
})

describe('aSideComponentOverride', () => {
  it('builds a value its schema accepts', () => {
    expect(
      v.safeParse(sideComponentOverrideSchema, aSideComponentOverride()).issues,
    ).toBeUndefined()
  })

  it.each([
    ['target', () => ({ target: aSideId('left/other') })],
    ['component', () => ({ component: 'switch' })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aSideComponentOverride(fields)).toMatchObject(fields)
  })
})

describe('anOverride', () => {
  it.each([
    ['side-part', aSidePartOverride],
    ['side-component', aSideComponentOverride],
  ] as const)('builds the %s branch with its branch builder', (type, branchBuilder) => {
    expect(anOverride(type)).toEqual(branchBuilder())
    expect(v.safeParse(overrideSchema, anOverride(type)).issues).toBeUndefined()
  })
})
