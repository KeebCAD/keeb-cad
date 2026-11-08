import type * as v from 'valibot'

import type { EditableField, ReadOnlyField } from './types'

export function readOnlyField(get: () => unknown): ReadOnlyField {
  return { get }
}

export function editableField<S extends v.GenericSchema>(field: {
  schema: S
  get: () => unknown
  set: (value: v.InferOutput<S>) => void
}): EditableField {
  return field
}
