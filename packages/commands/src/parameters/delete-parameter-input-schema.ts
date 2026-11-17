import { parameterNameSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const deleteParameterInputSchema = v.strictObject({ name: parameterNameSchema })
