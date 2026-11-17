import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { parameterSchema } from '../parameter'
import { anExpression } from './expression'
import { aParameter } from './parameter'
import { aParameterName } from './parameter-name'

describe('aParameter', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(parameterSchema, aParameter()).issues).toBeUndefined()
  })

  it.each([
    ['name', () => ({ name: aParameterName('pitch') })],
    ['value', () => ({ value: anExpression('wall + 1mm') })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aParameter(fields)).toMatchObject(fields)
  })
})
