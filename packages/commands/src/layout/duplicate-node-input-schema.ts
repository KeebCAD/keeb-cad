import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const duplicateNodeInputSchema = v.strictObject({ id: idSchema })
