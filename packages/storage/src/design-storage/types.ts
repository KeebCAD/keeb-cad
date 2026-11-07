import type { Id, LoadError, Revision, StorageError } from '@keeb-cad/schema'

// The columns listDesigns and listVersions return, handed to save with the texts.
export interface DesignLabel {
  id: Id
  name: string
  revision: Revision
}

export interface DesignSummary {
  id: Id
  name: string
  revision: Revision
  savedAt: number
}

export type StorageUnavailable = Extract<StorageError, { kind: 'storage-unavailable' }>
export type SaveError = Extract<StorageError, { kind: 'storage-unavailable' | 'quota-exceeded' }>
export type LoadFailure =
  LoadError | Extract<StorageError, { kind: 'not-found' | 'storage-unavailable' }>
