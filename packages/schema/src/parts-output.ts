import * as v from 'valibot'

import { polygonRegionSchema } from './polygon-region'

export const partsOutputSchema = v.strictObject({
  ids: v.array(v.string()),
  rows: v.array(v.array(polygonRegionSchema)),
})
