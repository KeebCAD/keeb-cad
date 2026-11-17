import { Result } from '@keeb-cad/result'
import { match } from 'ts-pattern'

import { parseExpressionTree } from './parse-expression-tree'
import type { EvaluateError, ExpressionSyntaxError, ExpressionTree, Span, Value } from './types'

export function evaluate(
  expression: string,
  scope: ReadonlyMap<string, Value>,
): Result<Value, ExpressionSyntaxError | EvaluateError> {
  return parseExpressionTree(expression).flatMap((tree) => evaluateTree(tree, scope))
}

function evaluateTree(
  tree: ExpressionTree,
  scope: ReadonlyMap<string, Value>,
): Result<Value, EvaluateError> {
  const span = { start: tree.start, end: tree.end }
  return match(tree)
    .with({ type: 'number' }, ({ value, unit }) => Result.ok(withUnit(value, unit)))
    .with({ type: 'name' }, ({ name }) => {
      const value = scope.get(name)
      return value === undefined
        ? Result.err<EvaluateError>({ kind: 'unresolvable-reference', name, span })
        : Result.ok(value)
    })
    .with({ type: 'negate' }, ({ operand }) =>
      evaluateTree(operand, scope).map(({ value, unit }) => withUnit(-value, unit)),
    )
    .with({ type: 'binary' }, ({ op, left, right }) =>
      evaluateTree(left, scope).flatMap((l) =>
        evaluateTree(right, scope).flatMap((r) => combine(op, l, r, span)),
      ),
    )
    .exhaustive()
}

function combine(
  op: '+' | '-' | '*' | '/',
  left: Value,
  right: Value,
  span: Span,
): Result<Value, EvaluateError> {
  return match(op)
    .with('+', '-', (sign) => {
      if (left.unit !== right.unit)
        return Result.err<EvaluateError>({ kind: 'unit-mismatch', span })
      const value = sign === '+' ? left.value + right.value : left.value - right.value
      return Result.ok(withUnit(value, left.unit))
    })
    .with('*', () =>
      left.unit === undefined || right.unit === undefined
        ? Result.ok(withUnit(left.value * right.value, left.unit ?? right.unit))
        : Result.err<EvaluateError>({ kind: 'unit-mismatch', span }),
    )
    .with('/', () => {
      if (right.unit !== undefined)
        return Result.err<EvaluateError>({ kind: 'unit-mismatch', span })
      if (right.value === 0) return Result.err<EvaluateError>({ kind: 'division-by-zero', span })
      return Result.ok(withUnit(left.value / right.value, left.unit))
    })
    .exhaustive()
}

// A unitless value has no unit key at all, so whole-value comparisons see one shape.
function withUnit(value: number, unit: Value['unit']): Value {
  return unit === undefined ? { value } : { value, unit }
}
