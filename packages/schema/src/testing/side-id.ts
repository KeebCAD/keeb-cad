import * as v from 'valibot'

import { sideIdSchema } from '../side-id'
import type { SideId } from '../types'

export function aSideId(text = 'left/id'): SideId {
  return v.parse(sideIdSchema, text)
}
