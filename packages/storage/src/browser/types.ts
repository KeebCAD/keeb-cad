import type { StoredVersion, VersionId } from '../backend/types'

export type VersionRow = StoredVersion & { version: VersionId }

export interface MetaRow {
  key: 'counter'
  value: number
}
