import { InvariantError, Result } from '@keeb-cad/result'
import {
  type Design,
  type Frozen,
  type Parameter,
  parameterSchema,
  type Rejection,
} from '@keeb-cad/schema'

import { evaluateFieldExpression } from '../evaluation/evaluate-field-expression'
import { reject } from '../reject/reject'
import { expressionFaultMessage } from '../violations/expression-fault-message'
import { parameterTakenMessage } from '../violations/parameter-taken-message'

// Refuses a taken name, so adding never changes a parameter the design has, and a value that fails
// as the structural check would name it. One that reads a failed parameter passes, since that
// parameter reports its own fault and the structural check refuses nothing for it either.
export function checkAddParameter(
  design: Frozen<Design>,
  { name, value }: Frozen<Parameter>,
): Result<void, Rejection> {
  if (design.parameters.some((parameter) => parameter.name === name)) {
    return Result.err(reject('id-taken', [name], parameterTakenMessage(name)))
  }
  const evaluated = evaluateFieldExpression(design.parameters, value, parameterSchema.entries.value)
  if (evaluated.isOk()) return Result.ok()
  const failure = evaluated.error
  if (failure.kind === 'reads-failed-parameter') return Result.ok()
  if (failure.kind === 'expression-syntax-error') {
    throw new InvariantError(
      `The parameter "${name}"'s value "${value}" passed its schema but does not parse.`,
    )
  }
  return Result.err(reject(failure.kind, [name], expressionFaultMessage(failure, [name])))
}
