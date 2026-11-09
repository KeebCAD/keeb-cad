import { registerCommand } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { DeletePart } from './delete-part'

export const partsCommandsModule: Module = {
  register(container) {
    registerCommand(container, DeletePart)
  },
}
