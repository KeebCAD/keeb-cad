import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from './design'

describe('metaSchema', () => {
  it('refuses a field it does not define, at that field', () => {
    const value = {
      meta: {
        id: 'corne',
        name: 'Corne',
        form: { type: 'split', board: 'reversible' },
        key: { id: 'k1' },
      },
      layout: { id: 'root', arrangement: 'free', children: [] },
    }

    const result = v.safeParse(designSchema, value)

    expect(
      (result.issues ?? []).map((issue) => (issue.path ?? []).map((item) => item.key)),
    ).toEqual([['meta', 'key']])
  })
})
