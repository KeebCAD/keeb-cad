import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from './design'
import { aDesign } from './testing'

describe('designSchema', () => {
  it('refuses a design with no overrides section, at overrides', () => {
    const { meta, libraryVersions, parts, layout } = aDesign()

    const result = v.safeParse(designSchema, { meta, libraryVersions, parts, layout })

    expect((result.issues ?? []).map((issue) => (issue.path ?? []).map(({ key }) => key))).toEqual([
      ['overrides'],
    ])
  })
})
