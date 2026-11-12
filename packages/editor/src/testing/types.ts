import type { DesignStore } from '@keeb-cad/design'
import type { Injector, Module } from '@keeb-cad/di'
import type { Design, LayoutOutput, PartsOutput, StorageError } from '@keeb-cad/schema'
import type * as v from 'valibot'
import type { FakeWorker, RecordingModelWorkerLifecycle } from '@keeb-cad/workers/testing'
import type { Router } from 'vue-router'

import type { Invoke } from '../invoke/invoke'
import type { testRenameDesignInputSchema } from './test-rename-design-input-schema'
import type { testBrokenStoreNameInputSchema } from './test-broken-store-name-input-schema'
import type { testStoreNameInputSchema } from './test-store-name-input-schema'

export type KeyPress = { key: string; code: string; shift?: boolean; ctrl?: boolean }

export type ColorScheme = 'dark' | 'light'

export type ShellArrangement = {
  path: string
  design?: Design
  recordFocus?: boolean
  spawn?: boolean
  modules?: readonly Module[]
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

export type LayoutRowOf = LayoutOutput['rows'][number]

export type TestRenameDesignInput = v.InferOutput<typeof testRenameDesignInputSchema>

export type TestStoreNameInput = v.InferOutput<typeof testStoreNameInputSchema>

export type TestStoreNameFailure = Extract<StorageError, { kind: 'quota-exceeded' }>

export type TestBrokenStoreNameInput = v.InferOutput<typeof testBrokenStoreNameInputSchema>
