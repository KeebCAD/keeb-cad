import type { Module } from '@keeb-cad/di'

import { devSeeds } from '../launch/tokens'
import { CorneySeed } from './corney-seed'

export const devSeedModule: Module = {
  register(container) {
    container.register(devSeeds).useClass(CorneySeed)
  },
}
