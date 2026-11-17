import type { Command, Writable } from '@keeb-cad/design'
import { checkDeleteParameter, deleteParameter } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { deleteParameterInputSchema } from './delete-parameter-input-schema'
import type { DeleteParameterInput } from './types'

export class DeleteParameter implements Command<DeleteParameterInput> {
  static readonly kind = 'command'
  static readonly id = 'parameters.deleteParameter'
  static readonly label = 'Delete parameter'
  static readonly input = deleteParameterInputSchema

  available(design: Frozen<Design>, { name }: DeleteParameterInput): Result<void, Rejection> {
    return checkDeleteParameter(design, name)
  }

  apply(draft: Writable<Design>, { name }: DeleteParameterInput): void {
    deleteParameter(draft, name)
  }
}
