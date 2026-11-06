import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { idSchema } from '../id'
import { anId } from './id'

describe('anId', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(idSchema, anId()).issues).toBeUndefined()
  })
})
