import { registerAction } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { NewDesign } from './new-design'

export const designActionsModule: Module = {
  register(container) {
    registerAction(container, NewDesign)
  },
}
