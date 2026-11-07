import { designActionsModule, loadModule } from '@keeb-cad/commands'
import { designModule } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'
import { storageModule } from '@keeb-cad/storage'
import { workersModule } from '@keeb-cad/workers'

import { autosaveModule } from './autosave/autosave-module'

export const mainModules: readonly Module[] = [
  designModule,
  designActionsModule,
  workersModule,
  storageModule,
  loadModule,
  autosaveModule,
]
