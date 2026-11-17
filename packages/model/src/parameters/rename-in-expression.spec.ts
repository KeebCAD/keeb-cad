import { InvariantError } from '@keeb-cad/result'
import { expressionSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { renameInExpression } from './rename-in-expression'

describe('renameInExpression', () => {
  it.each([
    ['keeps spacing and parentheses', '( ks +2mm )*2', 'ks', 'key', '( key +2mm )*2'],
    ['leaves a name that contains the old one', 'ksx + ks', 'ks', 'key', 'ksx + key'],
    ['rewrites every use to a shorter name', 'ks * ks - ks', 'ks', 'k', 'k * k - k'],
    ['rewrites to a longer name', 'ks/2', 'ks', 'key_size', 'key_size/2'],
    ['leaves an expression without the name', 'wall + 1mm', 'ks', 'key', 'wall + 1mm'],
  ])('%s', (_role, expression, from, to, expected) => {
    expect(renameInExpression(expression, from, to)).toBe(expected)
  })

  it('gives a text the expression schema accepts', () => {
    const expected = '2*ключ+1mm'

    const renamed = renameInExpression('2*ks+1mm', 'ks', 'ключ')

    expect(v.safeParse(expressionSchema, renamed)).toMatchObject({
      success: true,
      output: expected,
    })
  })

  it('throws InvariantError on a text that does not parse', () => {
    expect(() => renameInExpression('1mm +', 'ks', 'key')).toThrow(InvariantError)
  })
})
