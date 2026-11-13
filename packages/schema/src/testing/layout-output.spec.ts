import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { layoutOutputSchema } from '../layout-output'
import { aBorder } from './border'
import { aLayoutOutput, aLayoutRow } from './layout-output'

describe('aLayoutOutput', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(layoutOutputSchema, aLayoutOutput()).issues).toBeUndefined()
  })

  it.each([
    ['ids', () => ({ ids: ['left/root'] })],
    [
      'rows',
      () => ({
        rows: [aLayoutRow({ kind: 'group', part: -1 })],
      }),
    ],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aLayoutOutput(fields)).toMatchObject(fields)
  })
})

describe('aLayoutRow', () => {
  it('builds a row its schema accepts', () => {
    const output = aLayoutOutput({ ids: ['left/a'], rows: [aLayoutRow()] })

    expect(v.safeParse(layoutOutputSchema, output).issues).toBeUndefined()
  })

  it.each([
    ['kind', { kind: 'group' as const }],
    ['frame', { frame: { x: 1, y: 2, rot: 3, mirrored: true } }],
    ['anchorAt', { anchorAt: { x: 4, y: 5 } }],
    ['part', { part: 7 }],
    ['fit', { fit: 'stand-in' as const }],
    ['placed', { placed: false }],
    ['border', { border: aBorder() }],
  ])('keeps the %s it is given', (_field, fields) => {
    expect(aLayoutRow(fields)).toMatchObject(fields)
  })
})
