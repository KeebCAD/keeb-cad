import { angleSchema, deltaSchema, idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

// Each axis on its own, so an edit to one axis of many nodes keeps each node's other axis.
const vec2EditSchema = v.strictObject({
  x: v.optional(deltaSchema),
  y: v.optional(deltaSchema),
})

export const setOffsetInputSchema = v.strictObject({
  ids: v.pipe(v.array(idSchema), v.minLength(1)),
  position: v.optional(v.nullable(vec2EditSchema)),
  rotation: v.optional(v.nullable(angleSchema)),
  pivot: v.optional(v.nullable(vec2EditSchema)),
})
