import * as v from 'valibot'

import { designPartSchema } from './design-part'
import { groupSchema } from './layout'
import { libraryVersionSchema } from './library-version'
import { metaSchema } from './meta'

// Sections in the design file's order.
export const designSchema = v.strictObject({
  meta: metaSchema,
  libraryVersions: v.array(libraryVersionSchema),
  parts: v.array(designPartSchema),
  layout: groupSchema,
})
