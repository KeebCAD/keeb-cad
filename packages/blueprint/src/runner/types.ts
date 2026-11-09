import type { BlueprintDeclaration, BlueprintId, Version } from '@keeb-cad/schema'

import type { BuildLaneArgs, LaneFailed, LaneOutput } from '../lane/types'
import type { LaneRef } from '../pool/types'

export interface BlueprintPin {
  id: BlueprintId
  version: Version
}

export interface ResolvedPin {
  root: BlueprintDeclaration
  /** Every declaration the root reaches through `uses`, transitively. */
  closure: BlueprintDeclaration[]
}

export interface LaneInputs {
  /** The arguments in the resolved form the cache key hashes; only the stage knows it. */
  canonical: unknown
  laneArgs: BuildLaneArgs
}

export interface RunnerLane extends LaneRef {
  stageVersion: number
}

export interface LaneCacheKeyParts {
  lane: RunnerLane
  closureKey: string
  canonical: unknown
}

export type CachedLaneResult = { ok: LaneOutput } | { err: LaneFailed }
