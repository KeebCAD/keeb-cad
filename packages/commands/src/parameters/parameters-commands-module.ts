import { registerCommand } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { AddParameter } from './add-parameter'
import { DeleteParameter } from './delete-parameter'
import { RenameParameter } from './rename-parameter'
import { SetParameter } from './set-parameter'

export const parametersCommandsModule: Module = {
  register(container) {
    registerCommand(container, SetParameter)
    registerCommand(container, AddParameter)
    registerCommand(container, RenameParameter)
    registerCommand(container, DeleteParameter)
  },
}
