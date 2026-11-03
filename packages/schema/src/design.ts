import * as v from 'valibot'

import { idSchema } from './kinds'

// The design file's authored sections (Data Schema). `Design` holds `meta` only so far; story 3
// adds `layout` and `DesignFile` with its `formatVersion`.

/** Board limits what the halves of a split design may differ in (AD-6). */
export const formSchema = v.variant('type', [
  v.object({ type: v.literal('split'), board: v.picklist(['reversible', 'mirrored']) }),
  v.object({ type: v.literal('unibody') }),
])
export type Form = v.InferOutput<typeof formSchema>

export const metaSchema = v.object({
  id: idSchema,
  name: v.string(),
  form: formSchema,
})
export type Meta = v.InferOutput<typeof metaSchema>

export const designSchema = v.object({
  meta: metaSchema,
})
export type Design = v.InferOutput<typeof designSchema>
