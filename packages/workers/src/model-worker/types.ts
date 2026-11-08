import type { Endpoint } from '@keeb-cad/messaging'
import type { Frozen, StageId, Violation } from '@keeb-cad/schema'

export type WorkerFailed = { message: string; stage?: StageId }

export type ModelWorkerStatus = 'idle' | 'running' | WorkerFailed

export type RunningStage = { stage: StageId; arrivedAt: number }

export type PostedIssues = { seq: number; violations: Frozen<Violation[]> }

export interface SpawnedWorker extends Endpoint {
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  addEventListener(type: 'error' | 'messageerror', listener: (event: Event) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  removeEventListener(type: 'error' | 'messageerror', listener: (event: Event) => void): void
  terminate(): void
}

export type Spawn = () => SpawnedWorker

export interface Running {
  worker: SpawnedWorker
  stop: () => void
}
