import * as v from 'valibot'

// No format check: a saved revision is only compared with another.
export const revisionSchema = v.pipe(v.string(), v.brand('Revision'))
