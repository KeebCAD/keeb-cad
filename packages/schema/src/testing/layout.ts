import * as v from 'valibot'

import { idSchema } from '../id'
import type { FreeGroup } from '../types'

export function aLayout({
  id = v.parse(idSchema, 'root'),
  arrangement = 'free',
  children = [],
}: Partial<FreeGroup> = {}): FreeGroup {
  return { id, arrangement, children }
}
