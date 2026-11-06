import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { hashSchema } from '../hash'
import { aHash } from './hash'

describe('aHash', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(hashSchema, aHash()).issues).toBeUndefined()
  })
})
