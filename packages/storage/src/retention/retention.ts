import { Option } from '@keeb-cad/result'
import type { Revision, VersionReason } from '@keeb-cad/schema'

import type { VersionId, VersionSummary } from '../backend/types'

export const rollingVersions = 20

// An autosave takes the slot of its revision's autosave, or else a new one, dropping the oldest
// autosaves past the cap; a named point replaces nothing.
export function replacedBy(
  versions: readonly VersionSummary[],
  revision: Revision,
  reason: VersionReason,
): VersionId[] {
  if (reason !== 'autosave') return []
  const autosaves = oldestFirst(versions.filter((version) => version.reason === 'autosave'))
  const sameRevision = autosaves.filter((version) => version.revision === revision)
  const others = autosaves.filter((version) => version.revision !== revision)
  const overCap = Math.max(0, others.length - (rollingVersions - 1))
  return [...sameRevision, ...others.slice(0, overCap)].map(({ version }) => version)
}

// Only rolling versions are pruned, so a named point survives storage pressure, and never the
// design's newest version, so the design keeps a stored copy.
export function pruneCandidate(versions: readonly VersionSummary[]): Option<VersionId> {
  const olderThanNewest = oldestFirst(versions).slice(0, -1)
  const oldest = olderThanNewest.find((version) => version.reason === 'autosave')
  return Option.fromNullable(oldest).map(({ version }) => version)
}

function oldestFirst(versions: readonly VersionSummary[]): VersionSummary[] {
  return versions.toSorted((a, b) => a.version - b.version)
}
