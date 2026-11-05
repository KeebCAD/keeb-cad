import * as v from 'valibot'

import { fingerprintSchema } from './fingerprint'
import { revisionSchema } from './revision'

export const fingerprintsFileSchema = v.strictObject({
  revision: revisionSchema,
  fingerprints: v.array(fingerprintSchema),
})
