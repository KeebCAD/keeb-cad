import * as v from 'valibot'

import { deltaSchema } from './delta'

export const vec2Schema = v.strictObject({ x: deltaSchema, y: deltaSchema })
