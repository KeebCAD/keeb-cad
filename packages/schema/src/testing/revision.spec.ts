import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { revisionSchema } from '../revision'
import { aRevision } from './revision'

describe('aRevision', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(revisionSchema, aRevision()).issues).toBeUndefined()
  })
})
