import { Result } from '@keeb-cad/result'
import { expectResult } from '@keeb-cad/result/testing'
import { angleSchema, lengthSchema, type Parameter } from '@keeb-cad/schema'
import { anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import type * as v from 'valibot'
import { describe, it } from 'vitest'

import { evaluateFieldExpression } from './evaluate-field-expression'
import type { EvaluatedValue, ExpressionError } from './types'

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

describe('evaluateFieldExpression', () => {
  it.each<[string, Parameter[], string, v.GenericSchema, EvaluatedValue]>([
    [
      'an expression reading a parameter, not as a literal',
      [parameter('stagger', '5mm')],
      'stagger + 0.37mm',
      lengthSchema,
      { value: 5.37, unit: 'mm', literal: false },
    ],
    [
      'a plain literal, as a literal',
      [],
      '5mm',
      lengthSchema,
      { value: 5, unit: 'mm', literal: true },
    ],
    [
      'a negated literal, as a literal',
      [],
      '-5deg',
      angleSchema,
      { value: -5, unit: 'deg', literal: true },
    ],
  ])('evaluates %s', (_role, parameters, expression, schema, expected) => {
    expectResult(evaluateFieldExpression(parameters, expression, schema), Result.ok(expected))
  })

  it.each<[string, Parameter[], string, ExpressionError]>([
    ['text that does not parse', [], '1mm +', { kind: 'expression-syntax-error' }],
    ['empty text', [], '', { kind: 'expression-syntax-error' }],
    [
      'a parameter in a loop',
      [parameter('a', 'b'), parameter('b', 'a')],
      'a',
      { kind: 'reads-failed-parameter' },
    ],
    ['a wrong-unit literal', [], '5deg', { kind: 'unit-mismatch' }],
    ['a length below 0', [], '-1mm', { kind: 'negative-length' }],
    ['an unknown name', [], 'nope', { kind: 'unresolvable-reference', name: 'nope' }],
    ['a division by zero', [], '1mm / 0', { kind: 'division-by-zero' }],
  ])('refuses %s as a length', (_role, parameters, expression, expected) => {
    expectResult(
      evaluateFieldExpression(parameters, expression, lengthSchema),
      Result.err(expected),
    )
  })
})
