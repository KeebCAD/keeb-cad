import { registerAction } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { LoadFlow } from './load-flow'
import { OpenStoredDesign } from './open-stored-design'

export const loadModule: Module = {
  register(container) {
    container.register(LoadFlow).useClass(LoadFlow)
    registerAction(container, OpenStoredDesign)
  },
}
