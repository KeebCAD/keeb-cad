import * as v from 'valibot'

import { revisionSchema } from './revision'

export const routingFileSchema = v.strictObject({
  revision: revisionSchema,
})
