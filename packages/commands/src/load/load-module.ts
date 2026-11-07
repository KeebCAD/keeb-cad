import type { Module } from '@keeb-cad/di'

import { LoadFlow } from './load-flow'

export const loadModule: Module = {
  register(container) {
    container.register(LoadFlow).useClass(LoadFlow)
  },
}
