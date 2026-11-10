import * as v from 'valibot'

export const layoutOutputSchema = v.strictObject({
  ids: v.array(v.string()),
  rows: v.array(
    v.strictObject({
      kind: v.picklist(['slot', 'group']),
      frame: v.strictObject({
        x: v.number(),
        y: v.number(),
        rot: v.number(),
        mirrored: v.boolean(),
      }),
      anchorAt: v.strictObject({ x: v.number(), y: v.number() }),
      part: v.number(),
      fit: v.picklist(['fitted', 'empty', 'stand-in']),
      placed: v.boolean(),
    }),
  ),
})
