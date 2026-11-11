import type { Command, Writable } from '@keeb-cad/design'
import { checkDeletePart, deletePart } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Mutable, Rejection } from '@keeb-cad/schema'

import type { DeletePartInput } from '../types'
import { deletePartInputSchema } from './delete-part-input-schema'

export class DeletePart implements Command<DeletePartInput> {
  static readonly kind = 'command'
  static readonly id = 'parts.deletePart'
  static readonly label = 'Delete part'
  static readonly input = deletePartInputSchema

  available(design: Frozen<Design>, { id }: DeletePartInput): Result<void, Rejection> {
    return checkDeletePart(design, id)
  }

  apply(draft: Writable<Design>, { id }: DeletePartInput): void | Rejection {
    return deletePart(draft as Mutable<Design>, id)
  }
}
