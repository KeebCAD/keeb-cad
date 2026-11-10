import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { gapSchema } from '../gap'
import { aGap } from './gap'
import { aLength } from './length'

describe('aGap', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(gapSchema, aGap()).issues).toBeUndefined()
  })

  it.each([
    ['x', () => ({ x: aLength('2mm') })],
    ['y', () => ({ y: aLength('3mm') })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aGap(fields)).toMatchObject(fields)
  })
})
