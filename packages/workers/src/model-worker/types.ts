import type { Endpoint } from '@keeb-cad/messaging'

export type ModelWorkerStatus = 'idle' | 'running' | 'failed'

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
