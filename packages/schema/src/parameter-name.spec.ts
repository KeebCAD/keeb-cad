import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { parameterNameSchema } from './parameter-name'

const LETTERS_FIRST = 'A parameter name is a letter, then letters, digits or _.'
const UNIT_WORD = 'mm and deg are units, not parameter names.'

describe('parameterNameSchema', () => {
  it.each([
    ['empty', ''],
    ['with a -', 'k-s'],
    ['starting with a digit', '2k'],
    ['starting with _', '_k'],
    ['with a non-ASCII digit', 'k٣'],
  ])('refuses a name %s, saying what a name is', (_role, name) => {
    expect(v.safeParse(parameterNameSchema, name)).toMatchObject({
      success: false,
      issues: [{ message: LETTERS_FIRST }],
    })
  })

  it.each([['mm'], ['deg']])('refuses the unit word %s, saying it is a unit', (name) => {
    expect(v.safeParse(parameterNameSchema, name)).toMatchObject({
      success: false,
      issues: [{ message: UNIT_WORD }],
    })
  })

  it.each([
    ['with _ and digits', 'key_2'],
    ['in a non-Latin script', 'ключ'],
    ['one letter past a unit word', 'mmm'],
    ['a unit word and a digit', 'deg2'],
    ['a unit word in another case', 'Mm'],
  ])('accepts a name %s', (_role, name) => {
    expect(v.safeParse(parameterNameSchema, name)).toMatchObject({ success: true, output: name })
  })
})
