import { Result } from '@keeb-cad/result'
import { match, P } from 'ts-pattern'

import { parseExpressionTree } from './parse-expression-tree'
import type { ExpressionTree, ParseError, Unit } from './types'

export function parseExpression(input: string): Result<{ value: number; unit: Unit }, ParseError> {
  const literal = parseExpressionTree(input).match({
    ok: (tree) => literalOf(tree, input.length),
    err: () => null,
  })
  return literal === null
    ? Result.err({ kind: 'expression-parse-failed', input })
    : Result.ok(literal)
}

function literalOf(tree: ExpressionTree, length: number): { value: number; unit: Unit } | null {
  return match(tree)
    .with({ type: 'number', start: 0, end: length, unit: P.nonNullable }, ({ value, unit }) => ({
      value,
      unit,
    }))
    .with(
      {
        type: 'negate',
        start: 0,
        end: length,
        operand: { type: 'number', start: 1, unit: P.nonNullable },
      },
      ({ operand: { value, unit } }) => ({ value: -value, unit }),
    )
    .otherwise(() => null)
}
