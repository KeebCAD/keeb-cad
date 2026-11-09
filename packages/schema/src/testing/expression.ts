import * as v from 'valibot'

import { expressionSchema } from '../expression'
import type { Expression } from '../types'

export function anExpression(text = '19mm'): Expression {
  return v.parse(expressionSchema, text)
}
