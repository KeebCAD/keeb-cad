import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { blueprintDesignPartSchema, designPartSchema } from '../design-part'
import { aBlueprintId } from './blueprint-id'
import { aBlueprintDesignPart, aDesignPart } from './design-part'
import { anId } from './id'

describe('aBlueprintDesignPart', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(blueprintDesignPartSchema, aBlueprintDesignPart()).issues).toBeUndefined()
  })

  it.each([
    ['id', () => ({ id: anId('other') })],
    ['blueprint', () => ({ blueprint: aBlueprintId('lib:blueprint/other') })],
    ['inputs', () => ({ inputs: { size: '1u' } })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aBlueprintDesignPart(fields)).toMatchObject(fields)
  })
})

describe('aDesignPart', () => {
  it.each(['blueprint', 'authored'] as const)('builds a valid %s part', (type) => {
    expect(aDesignPart(type)).toMatchObject({ type })
    expect(v.safeParse(designPartSchema, aDesignPart(type)).issues).toBeUndefined()
  })
})
