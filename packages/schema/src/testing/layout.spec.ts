import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { freeGroupSchema } from '../layout'
import { aLayout } from './layout'

describe('aLayout', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(freeGroupSchema, aLayout()).issues).toBeUndefined()
  })
})
