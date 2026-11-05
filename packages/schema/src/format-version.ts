import * as v from 'valibot'

// No upper bound: a version newer than the app knows is design-file's to refuse.
export const formatVersionSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.brand('FormatVersion'),
)
