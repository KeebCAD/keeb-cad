import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { offsetSchema } from '../offset'
import { anAngle } from './angle'
import { aDelta } from './delta'
import { anOffset } from './offset'
import { aVec2 } from './vec2'

describe('anOffset', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(offsetSchema, anOffset()).issues).toBeUndefined()
  })

  it.each([
    ['position', () => ({ position: aVec2({ x: aDelta('10mm') }) })],
    ['rotation', () => ({ rotation: anAngle('15deg') })],
    ['pivot', () => ({ pivot: aVec2({ y: aDelta('-10mm') }) })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(anOffset(fields)).toMatchObject(fields)
  })
})
