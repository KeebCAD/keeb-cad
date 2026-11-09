import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { laneDeclarationSchema } from '../lane-declaration'
import { aLaneDeclaration } from './lane-declaration'

describe('aLaneDeclaration', () => {
  it('is valid by default', () => {
    expect(v.safeParse(laneDeclarationSchema, aLaneDeclaration()).success).toBe(true)
  })

  it('takes overrides', () => {
    expect(aLaneDeclaration({ queries: ['q'] })).toMatchObject({ queries: ['q'] })
  })
})
