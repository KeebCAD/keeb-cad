import { type ExpressionTree, parseExpressionTree, type Span } from '@keeb-cad/expr'
import { InvariantError } from '@keeb-cad/result'
import { match } from 'ts-pattern'

import { spliceExpression } from '../expressions/splice-expression'

// Only whole name nodes are rewritten, so a name that merely contains `from` stays.
export function renameInExpression(expression: string, from: string, to: string): string {
  return parseExpressionTree(expression).match({
    ok: (tree) =>
      spliceExpression(
        expression,
        nameSpans(tree, from).map((span) => ({ span, text: to })),
      ),
    err: () => {
      // The schema admits only expressions that parse.
      throw new InvariantError(`"${expression}" passed its schema but does not parse.`)
    },
  })
}

function nameSpans(tree: ExpressionTree, name: string): Span[] {
  return match(tree)
    .with({ type: 'number' }, () => [])
    .with({ type: 'name' }, ({ name: found, start, end }) =>
      found === name ? [{ start, end }] : [],
    )
    .with({ type: 'negate' }, ({ operand }) => nameSpans(operand, name))
    .with({ type: 'binary' }, ({ left, right }) => [
      ...nameSpans(left, name),
      ...nameSpans(right, name),
    ])
    .exhaustive()
}
