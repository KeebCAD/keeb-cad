import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { stageIdSchema } from './stage-id'

describe('stageIdSchema', () => {
  it("lists the model worker's stages", () => {
    expect(stageIdSchema.options).toEqual([
      'parts',
      'layout',
      'shapes',
      'extras',
      'plates',
      'pcb',
      'firmware',
    ])
  })

  it('refuses a stage the model worker does not run', () => {
    expect(v.safeParse(stageIdSchema, 'routing').success).toBe(false)
  })
})
