import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { partsOutputSchema } from '../parts-output'
import { aPartsOutput, aResolvedParts } from './parts-output'

describe('aPartsOutput', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(partsOutputSchema, aPartsOutput()).issues).toBeUndefined()
  })

  it.each([
    ['ids', () => ({ ids: ['key@h'] })],
    ['rows', () => ({ rows: [{ w: 1, h: 2 }] })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aPartsOutput(fields)).toMatchObject(fields)
  })
})

describe('aResolvedParts', () => {
  it('is empty by default', () => {
    expect(aResolvedParts()).toEqual({
      output: { ids: [], rows: [] },
      slots: {},
      violations: [],
    })
  })

  it('keeps the output it is given', () => {
    const output = aPartsOutput()

    expect(aResolvedParts({ output }).output).toEqual(output)
  })
})
