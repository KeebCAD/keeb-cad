import * as v from 'valibot'

import { metaSchema } from './meta'

export const designSchema = v.object({
  meta: metaSchema,
})
