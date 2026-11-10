import { idSchema, offsetSchema, partRefSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import { childIndexSchema } from './child-index-schema'

const groupFields = {
  parent: v.optional(idSchema),
  index: v.optional(childIndexSchema),
  id: v.optional(idSchema),
  defaultPart: v.optional(partRefSchema),
  offset: v.optional(offsetSchema),
}

export const addGroupInputSchema = v.variant('arrangement', [
  v.strictObject({ arrangement: v.literal('chain'), axis: v.picklist(['x', 'y']), ...groupFields }),
  v.strictObject({ arrangement: v.literal('free'), ...groupFields }),
])
