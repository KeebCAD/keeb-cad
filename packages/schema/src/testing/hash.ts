import * as v from 'valibot'

import { hashSchema } from '../hash'
import type { Hash } from '../types'

export function aHash(text = 'h1'): Hash {
  return v.parse(hashSchema, text)
}
