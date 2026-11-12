import * as v from 'valibot'

export const testStoreNameInputSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'A name is required.')),
})
