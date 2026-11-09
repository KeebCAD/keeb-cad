import type { Node } from '@bgotink/kdl'
import type * as v from 'valibot'

type Issue = v.BaseIssue<unknown>
type AnySchema = v.BaseSchema<unknown, unknown, Issue>

export type ObjectLikeSchema =
  | v.ObjectSchema<v.ObjectEntries, v.ErrorMessage<v.ObjectIssue> | undefined>
  | v.StrictObjectSchema<v.ObjectEntries, v.ErrorMessage<v.StrictObjectIssue> | undefined>

// The schema kinds the codec reads, told apart by `type`. A piped schema keeps its first item's
// `type` and fields, so pipes need no case of their own.
export type CodecSchema =
  | ObjectLikeSchema
  | v.VariantSchema<string, v.VariantOptions<string>, v.ErrorMessage<v.VariantIssue> | undefined>
  | v.LazySchema<AnySchema>
  | v.OptionalSchema<AnySchema, unknown>
  | v.ArraySchema<AnySchema, v.ErrorMessage<v.ArrayIssue> | undefined>
  | v.StringSchema<v.ErrorMessage<v.StringIssue> | undefined>
  | v.NumberSchema<v.ErrorMessage<v.NumberIssue> | undefined>
  | v.BooleanSchema<v.ErrorMessage<v.BooleanIssue> | undefined>
  | v.UnionSchema<v.UnionOptions, v.ErrorMessage<v.UnionIssue<v.BaseIssue<unknown>>> | undefined>
  | v.RecordSchema<
      v.BaseSchema<string, string, Issue>,
      AnySchema,
      v.ErrorMessage<v.RecordIssue> | undefined
    >
  | v.LiteralSchema<v.Literal, v.ErrorMessage<v.LiteralIssue> | undefined>
  | v.PicklistSchema<v.PicklistOptions, v.ErrorMessage<v.PicklistIssue> | undefined>

// How a field is written: a value (a property, or a node's one argument at the top level), an
// object (a node holding its fields), a list (a node holding one node per item) or a record (a
// node holding one node per entry, named by its raw key).
export type FieldForm = 'value' | 'object' | 'list' | 'record'

export interface FieldMetadata {
  node?: string
  flatten?: boolean
}

export type Fields = Record<string, unknown>

export interface ReadFailure {
  readonly kind: 'err'
  readonly error: string
}

// A step of the reader's walk: a generator that yields the first failure, as `attempt` expects.
export type ReadStep<T> = Generator<ReadFailure, T, unknown>

export interface NodeContent {
  arguments: unknown[]
  properties: Map<string, unknown>
  propertyLines: Map<string, number | undefined>
  children: readonly Node[]
}
