import type {
  BlueprintDeclaration,
  BlueprintDesignPart,
  BlueprintId,
  BlueprintInputs,
  DesignPart,
  Id,
  LibraryData,
  LibraryVersion,
  PartRef,
  Version,
} from '@keeb-cad/schema'

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

export type FoundPart = Extract<PartResolution, { kind: 'found' }>
