import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { fingerprintSchema } from '../fingerprint'
import { aFingerprint } from './fingerprint'

describe('aFingerprint', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(fingerprintSchema, aFingerprint()).issues).toBeUndefined()
  })
})
