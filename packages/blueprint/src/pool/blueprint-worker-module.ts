import type { Module } from '@keeb-cad/di'

import { LaneCache } from '../runner/lane-cache'
import { LaneRunner } from '../runner/lane-runner'
import { EngineLoader } from '../sandbox/engine-loader'
import { VmPool } from './vm-pool'

export const blueprintWorkerModule: Module = {
  register(container) {
    container.register(EngineLoader).useClass(EngineLoader)
    container.register(VmPool).useClass(VmPool)
    container.register(LaneCache).useClass(LaneCache)
    container.register(LaneRunner).useClass(LaneRunner)
  },
}
