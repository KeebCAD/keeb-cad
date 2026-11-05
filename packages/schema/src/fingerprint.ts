import * as v from 'valibot'

import { hashSchema } from './hash'
import { idSchema } from './id'

export const fingerprintSchema = v.pipe(
  v.strictObject({ id: idSchema, slice: hashSchema, outputs: hashSchema }),
  v.metadata({ node: 'fingerprint' }),
)
