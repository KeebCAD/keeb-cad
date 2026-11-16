import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from './design'
import { aDesign } from './testing'

describe('designSchema', () => {
  it.each(['overrides', 'libraryVersions'] as const)(
    'refuses a design with no %s section, at that section',
    (section) => {
      const design = Object.fromEntries(
        Object.entries(aDesign()).filter(([key]) => key !== section),
      )

      expect(v.safeParse(designSchema, design)).toMatchObject({
        success: false,
        issues: [{ path: [{ key: section }] }],
      })
    },
  )
})
