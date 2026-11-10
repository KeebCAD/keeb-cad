import * as v from 'valibot'

import { lengthSchema } from '../length'
import type { Length } from '../types'

export function aLength(text = '19mm'): Length {
  return v.parse(lengthSchema, text)
}
