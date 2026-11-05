import * as v from 'valibot'

export const formSchema = v.variant('type', [
  v.strictObject({ type: v.literal('split'), board: v.picklist(['reversible', 'mirrored']) }),
  v.strictObject({ type: v.literal('unibody') }),
])
