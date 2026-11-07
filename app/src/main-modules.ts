import { designActionsModule } from '@keeb-cad/commands'
import { designModule } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'
import { workersModule } from '@keeb-cad/workers'

export const mainModules: readonly Module[] = [designModule, designActionsModule, workersModule]
