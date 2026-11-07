import * as v from 'valibot'

import { stageIdSchema } from '../stage-id'
import type { StageId } from '../types'

export function aStageId(text: string = 'parts'): StageId {
  return v.parse(stageIdSchema, text)
}
