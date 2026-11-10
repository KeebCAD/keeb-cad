import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { vec2Schema } from '../vec2'
import { aDelta } from './delta'
import { aVec2 } from './vec2'

describe('aVec2', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(vec2Schema, aVec2()).issues).toBeUndefined()
  })

  it.each([
    ['x', () => ({ x: aDelta('3mm') })],
    ['y', () => ({ y: aDelta('-4mm') })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aVec2(fields)).toMatchObject(fields)
  })
})
