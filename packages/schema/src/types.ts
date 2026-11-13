import type { Unit } from '@keeb-cad/expr'
import type { AsyncResult } from '@keeb-cad/result'
import type * as v from 'valibot'

import type { anchorSchema } from './anchor'
import type { attachPointSchema } from './attach-point'
import type { blueprintDeclarationSchema } from './blueprint-declaration'
import type { blueprintIdSchema } from './blueprint-id'
import type { designPartSchema } from './design-part'
import type { declaredInputSchema } from './declared-input'
import type { designSchema } from './design'
import type { expressionSchema } from './expression'
import type { fixSchema } from './fix'
import type { fingerprintSchema } from './fingerprint'
import type { fingerprintsFileSchema } from './fingerprints-file'
import type { formSchema } from './form'
import type { formatVersionSchema } from './format-version'
import type { gapSchema } from './gap'
import type { hashSchema } from './hash'
import type { idSchema } from './id'
import type {
  blueprintInputsSchema,
  inputValueSchema,
  quantityInputValueSchema,
} from './input-value'
import type { laneDeclarationSchema } from './lane-declaration'
import type { layoutOutputSchema } from './layout-output'
import type {
  chainGroupFieldsSchema,
  freeGroupFieldsSchema,
  slotFieldsSchema,
  slotSchema,
} from './layout'
import type { libraryIdSchema } from './library-id'
import type { libraryVersionSchema } from './library-version'
import type { metaSchema } from './meta'
import type { offsetSchema } from './offset'
import type { partIdSchema } from './part-id'
import type { partRefSchema } from './part-ref'
import type { partsOutputSchema } from './parts-output'
import type { revisionSchema } from './revision'
import type { routingFileSchema } from './routing-file'
import type { stageIdSchema } from './stage-id'
import type { upgradeMappingSchema } from './upgrade-mapping'
import type { vec2Schema } from './vec2'
import type { versionSchema } from './version'
import type { workspaceSchema } from './workspace'

export type RefSchema<S extends v.GenericSchema> = v.GenericSchema<
  v.InferInput<S>,
  v.InferOutput<S>
>

export type Id = v.InferOutput<typeof idSchema>
export type Revision = v.InferOutput<typeof revisionSchema>
export type Form = v.InferOutput<typeof formSchema>
export type Meta = v.InferOutput<typeof metaSchema>
export type Design = v.InferOutput<typeof designSchema>
export type FormatVersion = v.InferOutput<typeof formatVersionSchema>
export type Hash = v.InferOutput<typeof hashSchema>
export type Fingerprint = v.InferOutput<typeof fingerprintSchema>
export type RoutingFile = v.InferOutput<typeof routingFileSchema>
export type FingerprintsFile = v.InferOutput<typeof fingerprintsFileSchema>

export type Expression = v.InferOutput<typeof expressionSchema>
export type QuantityInputValue = v.InferOutput<typeof quantityInputValueSchema>
export type InputValue = v.InferOutput<typeof inputValueSchema>
export type BlueprintInputs = v.InferOutput<typeof blueprintInputsSchema>
export type BlueprintId = v.InferOutput<typeof blueprintIdSchema>
export type PartId = v.InferOutput<typeof partIdSchema>
export type LibraryId = v.InferOutput<typeof libraryIdSchema>
export type PartRef = v.InferOutput<typeof partRefSchema>
export type LibraryVersion = v.InferOutput<typeof libraryVersionSchema>
export type DesignPart = v.InferOutput<typeof designPartSchema>
export type BlueprintDesignPart = Extract<DesignPart, { type: 'blueprint' }>
export type PartsOutput = v.InferOutput<typeof partsOutputSchema>
export type Version = v.InferOutput<typeof versionSchema>
export type DeclaredInput = v.InferOutput<typeof declaredInputSchema>
export type QuantityInput = Extract<DeclaredInput, { kind: 'quantity' }>
export type OptionInput = Extract<DeclaredInput, { kind: 'option' }>
export type PlainInput = Extract<DeclaredInput, { kind: 'boolean' | 'text' }>
export type LaneDeclaration = v.InferOutput<typeof laneDeclarationSchema>
export type UpgradeMapping = v.InferOutput<typeof upgradeMappingSchema>
export type BlueprintDeclaration = v.InferOutput<typeof blueprintDeclarationSchema>

export type { Unit }

declare const unit: unique symbol

// Hand-declared: the unit is a phantom, so a length never passes for an angle.
export type Quantity<U extends Unit> = Expression & { readonly [unit]?: U }
export type Delta = Quantity<'mm'>
export type Length = Quantity<'mm'>
export type Angle = Quantity<'deg'>
export type Vec2 = v.InferOutput<typeof vec2Schema>
export type Offset = v.InferOutput<typeof offsetSchema>
export type Gap = v.InferOutput<typeof gapSchema>
export type LayoutOutput = v.InferOutput<typeof layoutOutputSchema>
export type AttachPoint = v.InferOutput<typeof attachPointSchema>
export type Anchor = v.InferOutput<typeof anchorSchema>

export interface ScriptLoadFailed {
  kind: 'script-load-failed'
  message: string
}

// Plain TypeScript with no schema: it never crosses a thread or enters a file.
export interface LibraryData {
  declarations: Readonly<Record<BlueprintId, Readonly<Record<Version, BlueprintDeclaration>>>>
  loadScript: (id: BlueprintId, version: Version) => AsyncResult<string, ScriptLoadFailed>
}

export type Slot = v.InferOutput<typeof slotSchema>

// The layout tree's unions and children fields are written by hand: TypeScript can't infer a type
// through the children cycle. The schemas are annotated with them, which checks they agree.
export type ChainGroup = v.InferOutput<typeof chainGroupFieldsSchema> & {
  anchor?: Anchor
  children: ChainChild[]
}
export type FreeGroup = v.InferOutput<typeof freeGroupFieldsSchema> & {
  anchor?: Anchor
  children: Node[]
}
export type Group = ChainGroup | FreeGroup
export type Node = Slot | Group

// A chain places its children, so they hold no anchor.
export type ChainChild =
  | v.InferOutput<typeof slotFieldsSchema>
  | (v.InferOutput<typeof chainGroupFieldsSchema> & { children: ChainChild[] })
  | (v.InferOutput<typeof freeGroupFieldsSchema> & { children: Node[] })

// The design file's own top-level node beside the authored sections; migrateBundle strips it.
export type DesignFile = { formatVersion: FormatVersion } & Design

export type DerivedFile = 'routing' | 'fingerprints'
export type BundleFile = 'design' | 'routing' | 'fingerprints'

export interface Emptied {
  file: DerivedFile
  reason: 'missing' | 'unreadable' | 'invalid'
}

export type LoadError =
  | { kind: 'format-too-new'; found: number }
  | { kind: 'migration-failed'; from: FormatVersion; message: string }
  | { kind: 'file-unreadable'; file: BundleFile; message: string }

export type StorageError =
  | { kind: 'not-found'; id: Id }
  | { kind: 'storage-unavailable'; message: string }
  | { kind: 'quota-exceeded' }

export type VersionReason = 'autosave' | 'reset'

// Current-format values not yet parsed: replaceDesign parses them.
export interface MigratedBundle {
  design: unknown
  routing?: unknown
  fingerprints?: unknown
  unreadable: DerivedFile[]
  migratedFrom?: FormatVersion
}

export type ItemId = Id | LibraryId

// Hand-declared: the crossing's channel has no validation yet.
export interface DesignPatch {
  op: 'replace' | 'remove' | 'add'
  path: (string | number)[]
  value?: unknown
}

export type Workspace = v.InferOutput<typeof workspaceSchema>
export type StageId = v.InferOutput<typeof stageIdSchema>

// Object keys and array indexes, [] for a root issue: a plain copy, so callers never see Valibot's
// issue type.
export interface SchemaIssue {
  path: (string | number)[]
  message: string
}

export type ModelRejectionKind =
  | 'default-part-required'
  | 'id-taken'
  | 'root-required'
  | 'unknown-target'
  | 'index-out-of-range'
  | 'dependency-cycle'
  | 'chain-child-anchored'
  | 'blueprint-input-invalid'

// The design store's own kinds carry no message: the editor writes their text from the kind.
export type Rejection =
  | { kind: 'input-invalid'; command: string; issues: SchemaIssue[] }
  | { kind: 'unavailable'; command: string }
  | { kind: 'unknown-command'; command: string }
  | { kind: 'stale'; seq: number; latest: number }
  | { kind: ModelRejectionKind; ids: ItemId[]; message: string }

export type ViolationKind =
  | 'blueprint-api-too-new'
  | 'lane-failed'
  | 'unresolvable-reference'
  | 'dependency-cycle'
  | 'blueprint-input-invalid'

export type Fix = v.InferOutput<typeof fixSchema>

export interface Violation {
  kind: ViolationKind
  severity: 'error' | 'warning'
  ids: ItemId[]
  message: string
  fixes: Fix[]
}

export interface DesignInvalid {
  kind: 'design-invalid'
  issues: SchemaIssue[]
}

// Plain TypeScript with no schema: it never crosses a thread or enters a file.
export interface ResolvedParts {
  output: PartsOutput
  slots: Record<Id, { run: string; fit: 'fitted' | 'stand-in' }>
  violations: Violation[]
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined

// A branded primitive is an intersection with an object type, so primitives are matched first.
export type Frozen<T> = T extends Primitive | ((...arguments_: never[]) => unknown)
  ? T
  : { readonly [K in keyof T]: Frozen<T[K]> }

// The one shape every thread reads a reactive value through; no Vue type crosses a package.
export type ReadonlyRef<T> = { readonly value: T }

export type Mutable<T> = T extends Primitive | ((...arguments_: never[]) => unknown)
  ? T
  : { -readonly [K in keyof T]: Mutable<T[K]> }
