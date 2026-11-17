import { evaluate, type Value } from '@keeb-cad/expr'
import { InvariantError, Result } from '@keeb-cad/result'
import { match } from 'ts-pattern'

import { expressionNames } from '../references/expression-names'
import type { SchemaMetadata } from '../references/types'
import type { ExpressionFault, ReadsFailedParameter } from './types'

// One expression against the evaluated parameters. A field with a unit must evaluate to it, and a
// length to 0 mm or more; a parameter has neither, so it may be unitless or negative. Reading a
// failed parameter fails as reads-failed-parameter, since that parameter reports its own fault.
export function evaluateField(
  expression: string,
  field: Pick<SchemaMetadata, 'unit' | 'quantity'>,
  scope: ReadonlyMap<string, Value>,
  failed: ReadonlySet<string>,
): Result<Value, ExpressionFault | ReadsFailedParameter> {
  if (expressionNames(expression).some((name) => failed.has(name))) {
    return Result.err({ kind: 'reads-failed-parameter' })
  }
  return evaluate(expression, scope)
    .mapErr((error) =>
      match(error)
        .with({ kind: 'expression-syntax-error' }, () => {
          throw new InvariantError(`"${expression}" passed its schema but does not parse.`)
        })
        .with({ kind: 'unresolvable-reference' }, ({ kind, name }): ExpressionFault => ({
          kind,
          name,
        }))
        .otherwise(({ kind }): ExpressionFault => ({ kind })),
    )
    .flatMap((value) => {
      if (field.unit !== undefined && value.unit !== field.unit) {
        return Result.err<ExpressionFault>({ kind: 'unit-mismatch' })
      }
      if (field.quantity === 'length' && value.value < 0) {
        return Result.err<ExpressionFault>({ kind: 'negative-length' })
      }
      return Result.ok(value)
    })
}
