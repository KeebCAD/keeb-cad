import { registerCommand } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { AddGroup } from './add-group'
import { AddSlot } from './add-slot'
import { DeleteNode } from './delete-node'
import { DuplicateNode } from './duplicate-node'

export const layoutCommandsModule: Module = {
  register(container) {
    registerCommand(container, AddGroup)
    registerCommand(container, AddSlot)
    registerCommand(container, DuplicateNode)
    registerCommand(container, DeleteNode)
  },
}
