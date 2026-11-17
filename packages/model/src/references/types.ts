import type { Unit } from '@keeb-cad/schema'
import type * as v from 'valibot'

export interface Reference {
  path: (string | number)[]
  kind: string
  target: string
}

export type Path = Reference['path']

export interface SchemaMetadata {
  refKind?: string
  expression?: boolean
  unit?: Unit
  quantity?: 'length' | 'delta' | 'angle'
}

// A value the schema walk stops at, with the metadata its schema declares.
export interface SchemaValue {
  path: Path
  metadata: SchemaMetadata
  value: unknown
}

// The fields of Valibot's schema kinds the walk reads, told apart by `type`.
export interface WalkedSchema {
  type: string
  wrapped?: v.GenericSchema
  entries?: Record<string, v.GenericSchema>
  item?: v.GenericSchema
  value?: v.GenericSchema
  options?: v.GenericSchema[]
  key?: string
  getter?: (input: unknown) => v.GenericSchema
}
