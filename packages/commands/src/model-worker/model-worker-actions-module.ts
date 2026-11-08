import { registerAction } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

import { RestartModelWorker } from './restart-model-worker'

export const modelWorkerActionsModule: Module = {
  register(container) {
    registerAction(container, RestartModelWorker)
  },
}
