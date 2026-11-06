import * as v from 'valibot'

import { idSchema } from '../id'
import type { Id } from '../types'

export function anId(text = 'id'): Id {
  return v.parse(idSchema, text)
}
