import { Result } from '@keeb-cad/result'

import { parse, SyntaxError as ParserSyntaxError } from './expression-parser'
import type { ExpressionSyntaxError, ExpressionTree } from './types'

// Past this length a deep nesting or a long chain could overflow the stack of the parser or of
// evaluate; refusing it first keeps both depths far inside Node's stack, the one measured.
const MAX_LENGTH = 512

export function parseExpressionTree(input: string): Result<ExpressionTree, ExpressionSyntaxError> {
  if (input.length > MAX_LENGTH)
    return Result.err({ kind: 'expression-syntax-error', input, offset: MAX_LENGTH })
  return Result.fromThrowing(
    () => parse(input) as ExpressionTree,
    (cause) => {
      // Any other throw is a defect in the grammar's actions, never a refusal.
      if (!(cause instanceof ParserSyntaxError)) throw cause
      return { kind: 'expression-syntax-error', input, offset: cause.location.start.offset }
    },
  )
}
