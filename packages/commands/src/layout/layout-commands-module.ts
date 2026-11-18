import { registerCommand } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { AddGroup } from './add-group'
import { AddSlot } from './add-slot'
import { DeleteNode } from './delete-node'
import { DuplicateNode } from './duplicate-node'
import { SetAnchor } from './set-anchor'
import { SetArrangement } from './set-arrangement'
import { SetGap } from './set-gap'
import { SetOffset } from './set-offset'

export const layoutCommandsModule: Module = {
  register(container) {
    registerCommand(container, AddGroup)
    registerCommand(container, AddSlot)
    registerCommand(container, DuplicateNode)
    registerCommand(container, DeleteNode)
    registerCommand(container, SetAnchor)
    registerCommand(container, SetGap)
    registerCommand(container, SetOffset)
    registerCommand(container, SetArrangement)
  },
}
