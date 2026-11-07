import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

export const openStoredDesignInputSchema = v.object({ id: idSchema })
