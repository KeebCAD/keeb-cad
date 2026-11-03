import * as v from 'valibot'

export const formSchema = v.variant('type', [
  v.object({ type: v.literal('split'), board: v.picklist(['reversible', 'mirrored']) }),
  v.object({ type: v.literal('unibody') }),
])
