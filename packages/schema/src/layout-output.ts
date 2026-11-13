import * as v from 'valibot'

import { borderSchema } from './border'

// An unplaced row holds NaN.
const coordinateSchema = v.union([v.number(), v.nan()])

export const layoutOutputSchema = v.strictObject({
  ids: v.array(v.string()),
  rows: v.array(
    v.strictObject({
      kind: v.picklist(['slot', 'group']),
      frame: v.strictObject({
        x: coordinateSchema,
        y: coordinateSchema,
        rot: coordinateSchema,
        mirrored: v.boolean(),
      }),
      anchorAt: v.strictObject({ x: coordinateSchema, y: coordinateSchema }),
      part: v.number(),
      fit: v.picklist(['fitted', 'empty', 'stand-in']),
      placed: v.boolean(),
      border: borderSchema,
    }),
  ),
})
