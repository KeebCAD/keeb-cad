import type { AsyncResult, Option } from '@keeb-cad/result'
import type { Id, Revision, VersionReason } from '@keeb-cad/schema'

import type { BundleTexts } from '../bundle/types'

// The save counter: one global sequence, never reused.
export type VersionId = number

// A version as write puts it: its texts, design id, name, revision, reason and save time.
export interface StoredVersion {
  designId: Id
  name: string
  revision: Revision
  reason: VersionReason
  savedAt: number
  texts: BundleTexts
}

// What listVersions shows of a version, without its texts.
export interface VersionSummary {
  version: VersionId
  revision: Revision
  reason: VersionReason
  savedAt: number
}

// What the backend lists of a version: the summary and the name it was saved under.
export interface NamedVersionSummary extends VersionSummary {
  name: string
}

// A stored design, as its newest write left it.
export interface StoredDesign {
  id: Id
  name: string
  revision: Revision
  lastVersion: VersionId
  savedAt: number
}

// An error a backend operation caught, as plain data: Dexie wraps a DOMException as `inner`.
export interface CaughtError {
  name: string
  message: string
  inner?: { name: string; message: string }
}

// Each operation is one transaction.
export interface StorageBackend {
  // Allocates the next save counter, puts the version and the stored design, and deletes
  // `replaces`.
  write(version: StoredVersion, replaces: readonly VersionId[]): AsyncResult<VersionId, CaughtError>
  versions(designId: Id): AsyncResult<NamedVersionSummary[], CaughtError>
  designs(): AsyncResult<StoredDesign[], CaughtError>
  read(version: VersionId): AsyncResult<Option<BundleTexts>, CaughtError>
  delete(versions: readonly VersionId[]): AsyncResult<void, CaughtError>
}
