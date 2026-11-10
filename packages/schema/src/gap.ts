import * as v from 'valibot'

import { lengthSchema } from './length'

export const gapSchema = v.strictObject({ x: lengthSchema, y: lengthSchema })
