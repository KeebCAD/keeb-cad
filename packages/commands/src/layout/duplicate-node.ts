import type { Command, Writable } from '@keeb-cad/design'
import { duplicateNode } from '@keeb-cad/model/main'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { duplicateNodeInputSchema } from './duplicate-node-input-schema'
import type { DuplicateNodeInput } from './types'

export class DuplicateNode implements Command<DuplicateNodeInput> {
  static readonly kind = 'command'
  static readonly id = 'layout.duplicateNode'
  static readonly label = 'Duplicate'
  static readonly input = duplicateNodeInputSchema

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, { id }: DuplicateNodeInput): void | Rejection {
    return duplicateNode(draft, id)
  }
}
