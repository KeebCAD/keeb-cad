import * as v from 'valibot'

export const testRenameDesignInputSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, 'A name is required.')),
})
