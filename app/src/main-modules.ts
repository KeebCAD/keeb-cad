import { designActionsModule } from '@keeb-cad/commands'
import { designModule } from '@keeb-cad/design'
import type { Module } from '@keeb-cad/di'

export const mainModules: readonly Module[] = [designModule, designActionsModule]
