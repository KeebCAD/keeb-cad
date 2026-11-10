import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { angleSchema } from './angle'
import { deltaSchema } from './delta'
import { lengthSchema } from './length'

describe('the quantity schemas', () => {
  it.each([
    ['lengthSchema', 'accepts', 'a length in mm', lengthSchema, '15mm', true],
    ['lengthSchema', 'refuses', 'an angle in deg', lengthSchema, '15deg', false],
    ['angleSchema', 'accepts', 'an angle in deg', angleSchema, '15deg', true],
    ['angleSchema', 'refuses', 'a length in mm', angleSchema, '15mm', false],
    ['deltaSchema', 'accepts', 'a negative length in mm', deltaSchema, '-15mm', true],
    ['deltaSchema', 'refuses', 'an angle in deg', deltaSchema, '15deg', false],
  ])('%s %s %s', (_schema, _outcome, _role, schema, input, expected) => {
    expect(v.safeParse(schema, input).success).toBe(expected)
  })

  it.each([
    ['lengthSchema', lengthSchema, { expression: true, unit: 'mm', quantity: 'length' }],
    ['deltaSchema', deltaSchema, { expression: true, unit: 'mm', quantity: 'delta' }],
    ['angleSchema', angleSchema, { expression: true, unit: 'deg', quantity: 'angle' }],
  ])('%s declares its expression, unit and quantity for the walk', (_name, schema, expected) => {
    expect(v.getMetadata(schema)).toEqual(expected)
  })
})
