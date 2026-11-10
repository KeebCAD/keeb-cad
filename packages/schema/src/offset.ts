import * as v from 'valibot'

import { angleSchema } from './angle'
import { vec2Schema } from './vec2'

export const offsetSchema = v.strictObject({
  position: v.optional(vec2Schema),
  rotation: v.optional(angleSchema),
  pivot: v.optional(vec2Schema),
})
