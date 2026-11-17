import { InvariantError } from '@keeb-cad/result'

import type { SpliceEdit } from './types'

// Each edit's span replaced by its text, so the text around the spans stays as typed.
export function spliceExpression(expression: string, edits: readonly SpliceEdit[]): string {
  const ordered = edits.toSorted((a, b) => a.span.start - b.span.start)
  let spliced = ''
  let from = 0
  for (const { span, text } of ordered) {
    if (span.end < span.start || span.end > expression.length || span.start < from) {
      // Every caller takes its spans from the expression's own tree.
      throw new InvariantError(
        `The span ${span.start}-${span.end} does not fit "${expression}" past offset ${from}.`,
      )
    }
    spliced += expression.slice(from, span.start) + text
    from = span.end
  }
  return spliced + expression.slice(from)
}
