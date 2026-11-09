import * as v from 'valibot'

import { partIdSchema } from '../part-id'
import type { PartId } from '../types'

export function aPartId(text = 'lib:part/test'): PartId {
  return v.parse(partIdSchema, text)
}
