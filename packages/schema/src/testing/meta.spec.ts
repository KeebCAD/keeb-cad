import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { metaSchema } from '../meta'
import { aMeta } from './meta'

describe('aMeta', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(metaSchema, aMeta()).issues).toBeUndefined()
  })
})
