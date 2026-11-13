import { anchorSchema, idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const setAnchorInputSchema = v.strictObject({
  id: idSchema,
  anchor: v.optional(anchorSchema),
})
