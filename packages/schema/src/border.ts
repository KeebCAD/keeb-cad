import * as v from 'valibot'

const pointSchema = v.strictObject({ x: v.number(), y: v.number() })

export const borderSchema = v.array(
  v.strictObject({ outer: v.array(pointSchema), holes: v.array(v.array(pointSchema)) }),
)
