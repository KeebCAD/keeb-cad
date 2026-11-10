import * as v from 'valibot'

import { angleSchema } from '../angle'
import type { Angle } from '../types'

export function anAngle(text = '0deg'): Angle {
  return v.parse(angleSchema, text)
}
