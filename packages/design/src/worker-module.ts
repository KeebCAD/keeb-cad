import type { Module } from '@keeb-cad/di'

import { DesignPatcher } from './patching/design-patcher'

export const designWorkerModule: Module = {
  register(container) {
    container.register(DesignPatcher).useClass(DesignPatcher)
  },
}
