import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { fingerprintsFileSchema } from '../fingerprints-file'
import { aFingerprintsFile } from './fingerprints-file'

describe('aFingerprintsFile', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(fingerprintsFileSchema, aFingerprintsFile()).issues).toBeUndefined()
  })
})
