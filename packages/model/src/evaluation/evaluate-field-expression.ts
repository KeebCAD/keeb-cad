import { parseExpression, parseExpressionTree } from '@keeb-cad/expr'
import { Result } from '@keeb-cad/result'
import type { Frozen, Parameter } from '@keeb-cad/schema'
import * as v from 'valibot'

import type { SchemaMetadata } from '../references/types'
import { evaluateField } from './evaluate-field'
import { evaluateParameters } from './evaluate-parameters'
import type { EvaluatedValue, ExpressionError } from './types'

// Text not yet applied, against the design's parameters and the field's schema: it may not even
// parse, so it is parsed before it is evaluated.
export function evaluateFieldExpression(
  parameters: Frozen<Parameter[]>,
  expression: string,
  schema: v.GenericSchema,
): Result<EvaluatedValue, ExpressionError> {
  if (parseExpressionTree(expression).isErr()) {
    return Result.err({ kind: 'expression-syntax-error' })
  }
  const { scope, failed } = evaluateParameters(parameters)
  const literal = parseExpression(expression).isOk()
  return evaluateField(expression, v.getMetadata(schema) as SchemaMetadata, scope, failed).map(
    (value): EvaluatedValue => ({ ...value, literal }),
  )
}
