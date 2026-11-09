import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from './design'
import { aDesign, aMeta } from './testing'

describe('metaSchema', () => {
  it('refuses a field it does not define, at that field', () => {
    const value = { ...aDesign(), meta: { ...aMeta(), key: { id: 'k1' } } }

    const result = v.safeParse(designSchema, value)

    expect(
      (result.issues ?? []).map((issue) => (issue.path ?? []).map((item) => item.key)),
    ).toEqual([['meta', 'key']])
  })
})
