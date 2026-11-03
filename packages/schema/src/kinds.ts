import * as v from 'valibot'

// Shared kinds (Data Schema), each coded by its first reader. A brand comes from its schema, so a
// branded value means "checked" (AD-24).

/** An id `model` mints: kebab-case, unique per design, never reused (AD-8). */
export const idSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a kebab-case id'),
  v.brand('Id'),
)
export type Id = v.InferOutput<typeof idSchema>

/**
 * `hashing`'s content hash of the canonical design value, computed by `design`. A string brand with
 * no format check: a saved revision is only compared.
 */
export const revisionSchema = v.pipe(v.string(), v.brand('Revision'))
export type Revision = v.InferOutput<typeof revisionSchema>
