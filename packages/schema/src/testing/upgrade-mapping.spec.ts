import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { upgradeMappingSchema } from '../upgrade-mapping'
import { anUpgradeMapping } from './upgrade-mapping'

describe('anUpgradeMapping', () => {
  it('is valid by default', () => {
    expect(v.safeParse(upgradeMappingSchema, anUpgradeMapping()).success).toBe(true)
  })

  it('takes overrides', () => {
    expect(anUpgradeMapping({ renames: { a: 'b' } })).toMatchObject({ renames: { a: 'b' } })
  })
})
