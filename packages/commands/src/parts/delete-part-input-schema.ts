import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const deletePartInputSchema = v.strictObject({ id: idSchema })
