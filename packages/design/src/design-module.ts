import type { Module } from '@keeb-cad/di'

import { DesignPatcher } from './patching/design-patcher'
import { DesignStore } from './store/design-store'

export const designModule: Module = {
  register(container) {
    container.register(DesignPatcher).useClass(DesignPatcher)
    container.register(DesignStore).useClass(DesignStore).eager()
  },
}
