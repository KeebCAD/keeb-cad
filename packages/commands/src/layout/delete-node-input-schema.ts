import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const deleteNodeInputSchema = v.strictObject({ ids: v.array(idSchema) })
