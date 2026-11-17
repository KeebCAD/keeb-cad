import type { Command, Writable } from '@keeb-cad/design'
import { checkRenameParameter, renameParameter } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { renameParameterInputSchema } from './rename-parameter-input-schema'
import type { RenameParameterInput } from './types'

export class RenameParameter implements Command<RenameParameterInput> {
  static readonly kind = 'command'
  static readonly id = 'parameters.renameParameter'
  static readonly label = 'Rename parameter'
  static readonly input = renameParameterInputSchema

  available(design: Frozen<Design>, { from, to }: RenameParameterInput): Result<void, Rejection> {
    return checkRenameParameter(design, from, to)
  }

  apply(draft: Writable<Design>, { from, to }: RenameParameterInput): void {
    renameParameter(draft, from, to)
  }
}
