import { parseExpression } from '@keeb-cad/expr'
import { InvariantError } from '@keeb-cad/result'
import type { Expression } from '@keeb-cad/schema'

// Placement reads literals until expressions are evaluated; the schema admits nothing else yet.
export function literalValue(expression: Expression): number {
  return parseExpression(expression).match({
    ok: ({ value }) => value,
    err: () => {
      throw new InvariantError(`"${expression}" is not a literal placement can read.`)
    },
  })
}
