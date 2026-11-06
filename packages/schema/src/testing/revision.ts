import * as v from 'valibot'

import { revisionSchema } from '../revision'
import type { Revision } from '../types'

export function aRevision(text = 'r1'): Revision {
  return v.parse(revisionSchema, text)
}
