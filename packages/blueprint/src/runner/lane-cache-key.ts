import { hash } from '@keeb-cad/hashing'

import { argumentHash } from './argument-hash'
import type { LaneCacheKeyParts } from './types'

export function laneCacheKey({ lane, closureKey, canonical }: LaneCacheKeyParts): string {
  return hash({
    stage: lane.stage,
    stageVersion: lane.stageVersion,
    id: lane.id,
    version: lane.version,
    closure: closureKey,
    arguments: argumentHash(canonical),
  })
}
