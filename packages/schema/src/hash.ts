import * as v from 'valibot'

// No format check, like a revision: a saved hash is only compared with another.
export const hashSchema = v.pipe(v.string(), v.brand('Hash'))
