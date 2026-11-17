import { Result } from '@keeb-cad/result'
import type { Design, Frozen, ParameterName, Rejection } from '@keeb-cad/schema'

import { reject } from '../reject/reject'
import { parameterInUseMessage } from '../violations/parameter-in-use-message'
import { unknownParameterMessage } from '../violations/unknown-parameter-message'
import { parameterUsers } from './parameter-users'

// Refused while anything uses the name, so a delete never leaves an expression naming nothing.
export function checkDeleteParameter(
  design: Frozen<Design>,
  name: ParameterName,
): Result<void, Rejection> {
  if (design.parameters.every((parameter) => parameter.name !== name)) {
    return Result.err(reject('unknown-target', [name], unknownParameterMessage(name)))
  }
  const users = parameterUsers(design, name)
  return users.length > 0
    ? Result.err(reject('parameter-in-use', users, parameterInUseMessage(name, users)))
    : Result.ok()
}
