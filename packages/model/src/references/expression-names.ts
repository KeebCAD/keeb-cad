import { type ExpressionTree, parseExpressionTree } from '@keeb-cad/expr'
import { InvariantError } from '@keeb-cad/result'
import { match } from 'ts-pattern'

// Each name node of an expression, in reading order, repeats included.
export function expressionNames(expression: string): string[] {
  return parseExpressionTree(expression).match({
    ok: namesIn,
    err: () => {
      // The schema admits only expressions that parse.
      throw new InvariantError(`"${expression}" passed its schema but does not parse.`)
    },
  })
}

function namesIn(tree: ExpressionTree): string[] {
  return match(tree)
    .with({ type: 'number' }, () => [])
    .with({ type: 'name' }, ({ name }) => [name])
    .with({ type: 'negate' }, ({ operand }) => namesIn(operand))
    .with({ type: 'binary' }, ({ left, right }) => [...namesIn(left), ...namesIn(right)])
    .exhaustive()
}
