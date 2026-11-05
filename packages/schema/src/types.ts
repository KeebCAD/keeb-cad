import type * as v from 'valibot'

import type { designSchema } from './design'
import type { fingerprintSchema } from './fingerprint'
import type { fingerprintsFileSchema } from './fingerprints-file'
import type { formSchema } from './form'
import type { formatVersionSchema } from './format-version'
import type { hashSchema } from './hash'
import type { idSchema } from './id'
import type { chainGroupFieldsSchema, freeGroupFieldsSchema, slotSchema } from './layout'
import type { metaSchema } from './meta'
import type { revisionSchema } from './revision'
import type { routingFileSchema } from './routing-file'

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

export type Slot = v.InferOutput<typeof slotSchema>

// The layout tree's unions and children fields are written by hand: TypeScript can't infer a type
// through the children cycle. The schemas are annotated with them, which checks they agree.
export type ChainGroup = v.InferOutput<typeof chainGroupFieldsSchema> & { children: Node[] }
export type FreeGroup = v.InferOutput<typeof freeGroupFieldsSchema> & { children: Node[] }
export type Group = ChainGroup | FreeGroup
export type Node = Slot | Group

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

// Current-format values not yet parsed: replaceDesign parses them.
export interface MigratedBundle {
  design: unknown
  routing?: unknown
  fingerprints?: unknown
  unreadable: DerivedFile[]
  migratedFrom?: FormatVersion
}

export type ItemId = Id

// Object keys and array indexes, [] for a root issue: a plain copy, so callers never see Valibot's
// issue type.
export interface SchemaIssue {
  path: (string | number)[]
  message: string
}

// Each member is added by the story that first rejects with it.
export type ModelRejectionKind = never

// The design store's own kinds carry no message: the editor writes their text from the kind.
export type Rejection =
  | { kind: 'input-invalid'; command: string; issues: SchemaIssue[] }
  | { kind: 'unavailable'; command: string }
  | { kind: 'stale'; seq: number; latest: number }
  | { kind: ModelRejectionKind; ids: ItemId[]; message: string }

export interface DesignInvalid {
  kind: 'design-invalid'
  issues: SchemaIssue[]
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined

// A branded primitive is an intersection with an object type, so primitives are matched first.
export type Frozen<T> = T extends Primitive | ((...arguments_: never[]) => unknown)
  ? T
  : { readonly [K in keyof T]: Frozen<T[K]> }

export type Mutable<T> = T extends Primitive | ((...arguments_: never[]) => unknown)
  ? T
  : { -readonly [K in keyof T]: Mutable<T[K]> }
