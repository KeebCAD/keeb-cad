import { InvariantError, Result } from '@keeb-cad/result'
import { type Design, type Frozen, gapSchema, type Rejection } from '@keeb-cad/schema'

import { evaluateFieldExpression } from '../evaluation/evaluate-field-expression'
import { reject } from '../reject/reject'
import { expressionFaultMessage } from '../violations/expression-fault-message'
import type { GapEdit } from './types'

const AXES = ['x', 'y'] as const

// Each given axis in the order the gap declares them, refusing the first that fails as the
// structural check would name it. One that reads a failed parameter passes, since that parameter
// reports its own fault and the structural check refuses nothing for it either.
export function checkSetGap(
  design: Frozen<Design>,
  edit: Frozen<GapEdit>,
): Result<void, Rejection> {
  const ids = [design.meta.id]
  for (const axis of AXES) {
    const expression = edit[axis]
    if (expression === undefined) continue
    const evaluated = evaluateFieldExpression(
      design.parameters,
      expression,
      gapSchema.entries[axis],
    )
    if (evaluated.isOk()) continue
    const failure = evaluated.error
    if (failure.kind === 'reads-failed-parameter') continue
    if (failure.kind === 'expression-syntax-error') {
      throw new InvariantError(
        `The gap's ${axis} "${expression}" passed its schema but does not parse.`,
      )
    }
    return Result.err(reject(failure.kind, ids, expressionFaultMessage(failure, ids)))
  }
  return Result.ok()
}
