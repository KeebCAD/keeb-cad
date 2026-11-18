import { lengthSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const setGapInputSchema = v.strictObject({
  x: v.optional(lengthSchema),
  y: v.optional(lengthSchema),
})
