import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designSchema } from '../design'
import { aDesign } from './design'

describe('aDesign', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(designSchema, aDesign()).issues).toBeUndefined()
  })
})
