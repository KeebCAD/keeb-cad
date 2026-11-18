import { evaluateFieldExpression } from '@keeb-cad/model/main'
import type { Frozen, Parameter } from '@keeb-cad/schema'
import type * as v from 'valibot'

import { valueText } from './value-text'

// The value shown after an expression; none for a plain literal, which already reads as its value,
// or for one with no finite value.
export function evaluatedSuffix(
  parameters: Frozen<Parameter[]>,
  expression: string,
  schema: v.GenericSchema,
): string | undefined {
  const evaluated = evaluateFieldExpression(parameters, expression, schema)
  return evaluated.isOk() && !evaluated.value.literal && Number.isFinite(evaluated.value.value)
    ? valueText(evaluated.value.value, evaluated.value.unit)
    : undefined
}
