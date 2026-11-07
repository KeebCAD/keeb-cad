import type { StorageBackend } from '../backend/types'

export interface MemoryBackendOptions {
  // The most versions it holds; a write past it is refused for space.
  capacity?: number
}

export type MakeBackend = () => StorageBackend
