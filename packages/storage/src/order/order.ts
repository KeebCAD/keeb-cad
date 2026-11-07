import type { StoredDesign, VersionSummary } from '../backend/types'

// Orders follow the save counter, never a clock: two saves can share a millisecond.
export function newestFirst<V extends VersionSummary>(versions: readonly V[]): V[] {
  return versions.toSorted((a, b) => b.version - a.version)
}

export function latestSavedFirst(designs: readonly StoredDesign[]): StoredDesign[] {
  return designs.toSorted((a, b) => b.lastVersion - a.lastVersion)
}
