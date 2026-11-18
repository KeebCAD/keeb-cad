import { parameterNameSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const startRenameParameterInputSchema = v.strictObject({
  name: v.optional(parameterNameSchema),
})
