import * as v from 'valibot'

import { deltaSchema } from '../delta'
import type { Delta } from '../types'

export function aDelta(text = '0mm'): Delta {
  return v.parse(deltaSchema, text)
}
