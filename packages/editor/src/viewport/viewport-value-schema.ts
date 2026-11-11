import * as v from 'valibot'

import { maxZoom, minZoom } from './zoom-range'

const coordinateSchema = v.pipe(v.number(), v.finite())

// What storage and the devtools may set: a zoom outside the range is refused, never clamped.
export const viewportValueSchema = v.strictObject({
  centre: v.strictObject({ x: coordinateSchema, y: coordinateSchema }),
  zoom: v.pipe(v.number(), v.minValue(minZoom), v.maxValue(maxZoom)),
})
