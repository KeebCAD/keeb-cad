import type { Command, Writable } from '@keeb-cad/design'
import { deleteNode } from '@keeb-cad/model/main'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { deleteNodeInputSchema } from './delete-node-input-schema'
import type { DeleteNodeInput } from './types'

export class DeleteNode implements Command<DeleteNodeInput> {
  static readonly kind = 'command'
  static readonly id = 'layout.deleteNode'
  static readonly label = 'Delete'
  static readonly input = deleteNodeInputSchema

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, { ids }: DeleteNodeInput): void | Rejection {
    return deleteNode(draft, ids)
  }
}
