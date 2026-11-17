import type { Command, Writable } from '@keeb-cad/design'
import { setParameter } from '@keeb-cad/model/main'
import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { setParameterInputSchema } from './set-parameter-input-schema'
import type { SetParameterInput } from './types'

export class SetParameter implements Command<SetParameterInput> {
  static readonly kind = 'command'
  static readonly id = 'parameters.setParameter'
  static readonly label = 'Set parameter'
  static readonly input = setParameterInputSchema

  // A bad name fails the input schema, and a value that fails to evaluate is refused by the
  // store's structural check once applied, so there is nothing left to check here.
  available(_design: Frozen<Design>, _parameter: SetParameterInput): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, parameter: SetParameterInput): void {
    setParameter(draft, parameter)
  }
}
