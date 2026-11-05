import * as v from 'valibot'

import { idSchema } from './id'
import type { Group, Node } from './types'

export const slotSchema = v.pipe(v.strictObject({ id: idSchema }), v.metadata({ node: 'slot' }))

export const chainGroupFieldsSchema = v.strictObject({
  id: idSchema,
  arrangement: v.literal('chain'),
  axis: v.picklist(['x', 'y']),
})

export const freeGroupFieldsSchema = v.strictObject({
  id: idSchema,
  arrangement: v.literal('free'),
})

// Annotated, not inferred: TypeScript can't infer a type through the children cycle.
export const nodeSchema: v.GenericSchema<unknown, Node> = v.lazy((input) =>
  typeof input === 'object' && input !== null && 'arrangement' in input ? groupSchema : slotSchema,
)

const childrenSchema = v.pipe(v.array(v.lazy(() => nodeSchema)), v.metadata({ flatten: true }))

export const chainGroupSchema = v.pipe(
  v.strictObject({ ...chainGroupFieldsSchema.entries, children: childrenSchema }),
  v.metadata({ node: 'group' }),
)

export const freeGroupSchema = v.pipe(
  v.strictObject({ ...freeGroupFieldsSchema.entries, children: childrenSchema }),
  v.metadata({ node: 'group' }),
)

export const groupSchema: v.GenericSchema<unknown, Group> = v.variant('arrangement', [
  chainGroupSchema,
  freeGroupSchema,
])
