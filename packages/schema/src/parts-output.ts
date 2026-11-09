import * as v from 'valibot'

export const partsOutputSchema = v.strictObject({
  ids: v.array(v.string()),
  rows: v.array(v.strictObject({ w: v.number(), h: v.number() })),
})
