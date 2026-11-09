import type { Module } from '@keeb-cad/di'

import { EngineLoader } from '../sandbox/engine-loader'
import { VmPool } from './vm-pool'

export const blueprintWorkerModule: Module = {
  register(container) {
    container.register(EngineLoader).useClass(EngineLoader)
    container.register(VmPool).useClass(VmPool)
  },
}
