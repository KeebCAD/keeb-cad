import * as v from 'valibot'

import { anchorSchema } from './anchor'
import { idSchema } from './id'
import { blueprintInputsSchema } from './input-value'
import { offsetSchema } from './offset'
import { partRefSchema } from './part-ref'
import type { ChainChild, Group, Node } from './types'

export const slotFieldsSchema = v.strictObject({
  id: idSchema,
  offset: v.optional(offsetSchema),
  part: v.optional(partRefSchema),
  inputs: v.optional(blueprintInputsSchema),
})

export const chainGroupFieldsSchema = v.strictObject({
  id: idSchema,
  offset: v.optional(offsetSchema),
  defaultPart: v.optional(partRefSchema),
  arrangement: v.literal('chain'),
  axis: v.picklist(['x', 'y']),
})

export const freeGroupFieldsSchema = v.strictObject({
  id: idSchema,
  offset: v.optional(offsetSchema),
  defaultPart: v.optional(partRefSchema),
  arrangement: v.literal('free'),
})

// A node's anchor sits right after its id, so the file writes it there.
function withAnchor<E extends v.ObjectEntries & { id: typeof idSchema }>({ id, ...rest }: E) {
  return { id, anchor: v.optional(anchorSchema), ...rest }
}

export const slotSchema = v.pipe(
  v.strictObject(withAnchor(slotFieldsSchema.entries)),
  v.metadata({ node: 'slot' }),
)

// Annotated, not inferred: TypeScript can't infer a type through the children cycle.
export const nodeSchema: v.GenericSchema<unknown, Node> = v.lazy((input) =>
  isGroupInput(input) ? groupSchema : slotSchema,
)

// A chain places its children, so they hold no anchor.
export const chainChildSchema: v.GenericSchema<unknown, ChainChild> = v.lazy((input) =>
  isGroupInput(input) ? chainChildGroupSchema : chainChildSlotSchema,
)

const childrenSchema = v.pipe(v.array(v.lazy(() => nodeSchema)), v.metadata({ flatten: true }))

const chainChildrenSchema = v.pipe(
  v.array(v.lazy(() => chainChildSchema)),
  v.metadata({ flatten: true }),
)

export const chainGroupSchema = v.pipe(
  v.strictObject({ ...withAnchor(chainGroupFieldsSchema.entries), children: chainChildrenSchema }),
  v.metadata({ node: 'group' }),
)

export const freeGroupSchema = v.pipe(
  v.strictObject({ ...withAnchor(freeGroupFieldsSchema.entries), children: childrenSchema }),
  v.metadata({ node: 'group' }),
)

export const groupSchema: v.GenericSchema<unknown, Group> = v.variant('arrangement', [
  chainGroupSchema,
  freeGroupSchema,
])

const chainChildSlotSchema = v.pipe(slotFieldsSchema, v.metadata({ node: 'slot' }))

const chainChildGroupSchema = v.variant('arrangement', [
  v.pipe(
    v.strictObject({ ...chainGroupFieldsSchema.entries, children: chainChildrenSchema }),
    v.metadata({ node: 'group' }),
  ),
  v.pipe(
    v.strictObject({ ...freeGroupFieldsSchema.entries, children: childrenSchema }),
    v.metadata({ node: 'group' }),
  ),
])

function isGroupInput(input: unknown): boolean {
  return typeof input === 'object' && input !== null && 'arrangement' in input
}
