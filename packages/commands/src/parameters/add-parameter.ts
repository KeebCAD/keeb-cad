import type { Command, Writable } from '@keeb-cad/design'
import { addParameter, checkAddParameter } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { addParameterInputSchema } from './add-parameter-input-schema'
import type { AddParameterInput } from './types'

export class AddParameter implements Command<AddParameterInput> {
  static readonly kind = 'command'
  static readonly id = 'parameters.addParameter'
  static readonly label = 'Add parameter'
  static readonly input = addParameterInputSchema

  available(design: Frozen<Design>, parameter: AddParameterInput): Result<void, Rejection> {
    return checkAddParameter(design, parameter)
  }

  apply(draft: Writable<Design>, parameter: AddParameterInput): void {
    addParameter(draft, parameter)
  }
}
