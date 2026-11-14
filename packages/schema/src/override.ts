import * as v from 'valibot'

import { partRefSchema } from './part-ref'
import { ref } from './ref'

// A null part removes the slot's part on that side.
export const sidePartOverrideSchema = v.pipe(
  v.strictObject({
    type: v.literal('side-part'),
    target: ref('side-placement'),
    part: v.nullable(partRefSchema),
  }),
  v.metadata({ node: 'override' }),
)

export const sideComponentOverrideSchema = v.pipe(
  v.strictObject({
    type: v.literal('side-component'),
    target: ref('side-placement'),
    component: v.string(),
  }),
  v.metadata({ node: 'override' }),
)

export const overrideSchema = v.variant('type', [
  sidePartOverrideSchema,
  sideComponentOverrideSchema,
])
