import type * as v from 'valibot'

import type { designSchema } from './design'
import type { formSchema } from './form'
import type { idSchema } from './id'
import type { metaSchema } from './meta'
import type { revisionSchema } from './revision'

export type Id = v.InferOutput<typeof idSchema>
export type Revision = v.InferOutput<typeof revisionSchema>
export type Form = v.InferOutput<typeof formSchema>
export type Meta = v.InferOutput<typeof metaSchema>
export type Design = v.InferOutput<typeof designSchema>

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
