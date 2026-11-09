import { parseExpression } from '@keeb-cad/expr'
import * as v from 'valibot'

export const expressionSchema = v.pipe(
  v.string(),
  v.check((text) => parseExpression(text).isOk(), 'Not an expression.'),
  v.brand('Expression'),
  v.metadata({ expression: true }),
)
