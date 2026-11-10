import type { Command, Writable } from '@keeb-cad/design'
import { addNode } from '@keeb-cad/model/main'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

import { addSlotInputSchema } from './add-slot-input-schema'
import type { AddSlotInput } from './types'

export class AddSlot implements Command<AddSlotInput> {
  static readonly kind = 'command'
  static readonly id = 'layout.addSlot'
  static readonly label = 'Add slot'
  static readonly input = addSlotInputSchema

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, { parent, index, ...slot }: AddSlotInput): void | Rejection {
    return addNode(draft, slot, { parent, index })
  }
}
