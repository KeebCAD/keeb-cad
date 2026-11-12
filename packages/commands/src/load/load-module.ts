import { registerAction } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { DesignLoader } from './design-loader'
import { OpenStoredDesign } from './open-stored-design'

export const loadModule: Module = {
  register(container) {
    container.register(DesignLoader).useClass(DesignLoader)
    registerAction(container, OpenStoredDesign)
  },
}
