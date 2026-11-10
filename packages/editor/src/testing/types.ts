import type { DesignStore } from '@keeb-cad/design'
import type { Injector } from '@keeb-cad/di'
import type { Design, LayoutOutput, PartsOutput } from '@keeb-cad/schema'
import type { FakeWorker, RecordingModelWorkerLifecycle } from '@keeb-cad/workers/testing'
import type { Router } from 'vue-router'

import type { Invoke } from '../invoke/invoke'

export type KeyPress = { key: string; code: string; shift?: boolean }

export type ColorScheme = 'dark' | 'light'

export type ShellArrangement = {
  path: string
  design?: Design
  recordFocus?: boolean
  spawn?: boolean
}

export type RecordingShellArrangement = ShellArrangement & { recordFocus: true }

export type SpawningShellArrangement = ShellArrangement & { spawn: true }

export type MountedShell = { router: Router; invoke: Invoke; injector: Injector }

export type RecordingShell = MountedShell & { lifecycle: RecordingModelWorkerLifecycle }

export type SpawningShell = MountedShell & { store: DesignStore; spawned: FakeWorker[] }

export type LayoutSetPost = {
  seq: number
  layout: LayoutOutput
  parts: PartsOutput
  epoch?: number
}
