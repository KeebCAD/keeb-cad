import type * as v from 'valibot'

export interface Reference {
  path: (string | number)[]
  kind: string
  target: string
}

export type Path = Reference['path']

export interface ReferenceMetadata {
  refKind?: string
  expression?: boolean
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
