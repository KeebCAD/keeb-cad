import type {
  BlueprintDeclaration,
  BlueprintDesignPart,
  BlueprintInputs,
  BlueprintId,
  DesignPart,
  Id,
  LibraryVersion,
  LibraryData,
  PartRef,
  PartsOutput,
  ReadonlyRef,
  ResolvedParts,
  Version,
} from '@keeb-cad/schema'
import type { LaneFailure, LaneOutput } from '@keeb-cad/blueprint'
import type { Result } from '@keeb-cad/result'

export type Rectangle = PartsOutput['rows'][number]

export interface Derivations {
  parts: ReadonlyRef<ResolvedParts>
  pins: ReadonlyRef<{ id: BlueprintId; version: Version }[]>
}

export interface SlotPartRun {
  slot: Id
  /** Own part, then each ancestor group's default nearest first, then `meta.defaultPart`. */
  levels: readonly PartRef[]
  inputs: BlueprintInputs
}

export interface PartLookups {
  parts: readonly DesignPart[]
  libraryVersions: readonly LibraryVersion[]
  declarations: LibraryData['declarations']
}

export type PartResolution =
  | {
      kind: 'found'
      part: BlueprintDesignPart
      pin: { id: BlueprintId; version: Version }
      declaration: BlueprintDeclaration
    }
  | { kind: 'unresolved'; severity: 'warning' | 'error' }

export type PartViolationDetail =
  | { kind: 'unresolvable-reference' }
  | { kind: 'blueprint-api-too-new'; blueprint: string }
  | Extract<LaneFailure, { kind: 'lane-failed' }>

export interface PartRun {
  part: Id
  result: Result<LaneOutput, LaneFailure>
  slots: Id[]
}
