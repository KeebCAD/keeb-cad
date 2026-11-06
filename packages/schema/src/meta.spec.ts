import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from './design'
import { aLayout, aMeta } from './testing'

describe('metaSchema', () => {
  it('refuses a field it does not define, at that field', () => {
    const value = { meta: { ...aMeta(), key: { id: 'k1' } }, layout: aLayout() }

    const result = v.safeParse(designSchema, value)

    expect(
      (result.issues ?? []).map((issue) => (issue.path ?? []).map((item) => item.key)),
    ).toEqual([['meta', 'key']])
  })
})
