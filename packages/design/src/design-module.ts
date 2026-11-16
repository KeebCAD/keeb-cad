import type { Module } from '@keeb-cad/di'

import { UndoHistory } from './history/undo-history'
import { DesignPatcher } from './patching/design-patcher'
import { DesignStore } from './store/design-store'

export const designModule: Module = {
  register(container) {
    container.register(DesignPatcher).useClass(DesignPatcher)
    container.register(UndoHistory).useClass(UndoHistory)
    container.register(DesignStore).useClass(DesignStore).eager()
  },
}
