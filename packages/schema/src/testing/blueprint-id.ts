import * as v from 'valibot'

import { blueprintIdSchema } from '../blueprint-id'
import type { BlueprintId } from '../types'

export function aBlueprintId(text = 'lib:blueprint/test'): BlueprintId {
  return v.parse(blueprintIdSchema, text)
}
