import * as v from 'valibot'

export const stageIdSchema = v.picklist([
  'parts',
  'layout',
  'shapes',
  'extras',
  'plates',
  'pcb',
  'firmware',
])
