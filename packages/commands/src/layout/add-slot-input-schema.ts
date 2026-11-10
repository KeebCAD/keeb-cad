import { blueprintInputsSchema, idSchema, offsetSchema, partRefSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import { childIndexSchema } from './child-index-schema'

export const addSlotInputSchema = v.strictObject({
  parent: v.optional(idSchema),
  index: v.optional(childIndexSchema),
  id: v.optional(idSchema),
  part: v.optional(partRefSchema),
  inputs: v.optional(blueprintInputsSchema),
  offset: v.optional(offsetSchema),
})
