import { registerCommand } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { SetParameter } from './set-parameter'

export const parametersCommandsModule: Module = {
  register(container) {
    registerCommand(container, SetParameter)
  },
}
