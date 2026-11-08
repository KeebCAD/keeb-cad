import { designActionsModule, loadModule, modelWorkerActionsModule } from '@keeb-cad/commands'
import { designModule } from '@keeb-cad/design'
import { editorModule } from '@keeb-cad/editor'
import type { Module } from '@keeb-cad/di'
import { storageModule } from '@keeb-cad/storage'
import { workersModule } from '@keeb-cad/workers'

import { autosaveModule } from './autosave/autosave-module'
import { launchModule } from './launch/launch-module'

export const mainModules: readonly Module[] = [
  designModule,
  designActionsModule,
  modelWorkerActionsModule,
  editorModule,
  workersModule,
  storageModule,
  loadModule,
  autosaveModule,
  launchModule,
]
