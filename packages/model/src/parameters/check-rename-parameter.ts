import { parseExpressionTree } from '@keeb-cad/expr'
import { Result } from '@keeb-cad/result'
import type { Design, Frozen, ParameterName, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'
import { expressionTooLongMessage } from '../violations/expression-too-long-message'
import { parameterTakenMessage } from '../violations/parameter-taken-message'
import { unknownParameterMessage } from '../violations/unknown-parameter-message'
import { expressionOwners } from './expression-owners'
import { renamedExpressions } from './renamed-expressions'

// A rewrite of a name node to a valid name fails to parse only past the parser's length limit.
export function checkRenameParameter(
  design: Frozen<Design>,
  from: ParameterName,
  to: ParameterName,
): Result<void, Rejection> {
  const names = new Set(design.parameters.map(({ name }) => name))
  if (!names.has(from)) {
    return Result.err(reject('unknown-target', [from], unknownParameterMessage(from)))
  }
  if (to !== from && names.has(to)) {
    return Result.err(reject('id-taken', [to], parameterTakenMessage(to)))
  }
  const tooLong = expressionOwners(
    design,
    renamedExpressions(design, from, to)
      .filter(({ text }) => parseExpressionTree(text).isErr())
      .map(({ path }) => path),
  )
  return tooLong.length > 0
    ? Result.err(
        reject('expression-too-long', tooLong, expressionTooLongMessage(from, to, tooLong)),
      )
    : Result.ok()
}
