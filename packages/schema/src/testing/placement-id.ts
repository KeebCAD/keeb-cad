import * as v from 'valibot'

import { placementIdSchema } from '../placement-id'
import type { PlacementId } from '../types'

export function aPlacementId(text = 'left/id'): PlacementId {
  return v.parse(placementIdSchema, text)
}
