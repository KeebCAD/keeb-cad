import type { Command, Writable } from '@keeb-cad/design'
import { addNode, checkAddNode } from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { addGroupInputSchema } from './add-group-input-schema'
import type { AddGroupInput } from './types'

export class AddGroup implements Command<AddGroupInput> {
  static readonly kind = 'command'
  static readonly id = 'layout.addGroup'
  static readonly label = 'Add group'
  static readonly input = addGroupInputSchema

  available(design: Frozen<Design>, { parent, index, id }: AddGroupInput): Result<void, Rejection> {
    return checkAddNode(design, id, { parent, index })
  }

  apply(draft: Writable<Design>, { parent, index, ...group }: AddGroupInput): void | Rejection {
    return addNode(draft, { ...group, children: [] }, { parent, index })
  }
}
