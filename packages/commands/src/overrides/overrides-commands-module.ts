import { registerCommand } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { SetOverride } from './set-override'

export const overridesCommandsModule: Module = {
  register(container) {
    registerCommand(container, SetOverride)
  },
}
