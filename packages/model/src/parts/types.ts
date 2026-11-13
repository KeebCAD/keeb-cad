import type {
  BlueprintId,
  Id,
  LayoutOutput,
  PartsOutput,
  ReadonlyRef,
  ResolvedParts,
  Version,
  Violation,
} from '@keeb-cad/schema'
import type { LaneFailure, LaneOutput } from '@keeb-cad/blueprint'
import type { Result } from '@keeb-cad/result'

import type { BlueprintInputInvalid } from '../inputs/types'

export type Rectangle = PartsOutput['rows'][number]

export interface Derivations {
  parts: ReadonlyRef<ResolvedParts>
  pins: ReadonlyRef<{ id: BlueprintId; version: Version }[]>
  placements: ReadonlyRef<LayoutOutput>
  violations: ReadonlyRef<Violation[]>
}

export type PartViolationDetail =
  | { kind: 'unresolvable-reference' }
  | { kind: 'blueprint-api-too-new'; blueprint: string }
  | Extract<LaneFailure, { kind: 'lane-failed' }>
  | { kind: 'blueprint-input-invalid'; invalid: BlueprintInputInvalid }

export interface PartRun {
  part: Id
  result: Result<LaneOutput, LaneFailure>
  slots: Id[]
}
