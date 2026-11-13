import * as v from 'valibot'

import { attachPointSchema } from './attach-point'
import { ref } from './ref'

// A group exposes only its origin, so only a slot anchor names an attach point.
export const anchorSchema = v.variant('type', [
  v.strictObject({
    type: v.literal('slot'),
    ref: ref('slot'),
    attach: v.optional(attachPointSchema),
  }),
  v.strictObject({ type: v.literal('group'), ref: ref('group') }),
])
