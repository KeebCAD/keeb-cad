import * as v from 'valibot'

import { partRefSchema } from '../part-ref'
import type { PartRef } from '../types'

export function aPartRef(text = 'key'): PartRef {
  return v.parse(partRefSchema, text)
}
