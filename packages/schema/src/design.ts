import * as v from 'valibot'

import { groupSchema } from './layout'
import { metaSchema } from './meta'

// Sections in the design file's order.
export const designSchema = v.strictObject({
  meta: metaSchema,
  layout: groupSchema,
})
