import { parameterNameSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const renameParameterInputSchema = v.strictObject({
  from: parameterNameSchema,
  to: parameterNameSchema,
})
