import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

const idsSchema = v.pipe(v.array(idSchema), v.minLength(1))

export const setArrangementInputSchema = v.variant('arrangement', [
  v.strictObject({
    ids: idsSchema,
    arrangement: v.literal('chain'),
    axis: v.picklist(['x', 'y']),
  }),
  v.strictObject({ ids: idsSchema, arrangement: v.literal('free') }),
])
