import * as v from 'valibot'

export const idSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'An id is kebab-case.'),
  v.brand('Id'),
)
