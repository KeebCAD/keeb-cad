import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { fingerprintsFileSchema } from '../fingerprints-file'
import { aFingerprint } from './fingerprint'
import { aFingerprintsFile } from './fingerprints-file'
import { aRevision } from './revision'

describe('aFingerprintsFile', () => {
  it('builds a value its schema accepts', () => {
    expect(v.safeParse(fingerprintsFileSchema, aFingerprintsFile()).issues).toBeUndefined()
  })

  it.each([
    ['revision', () => ({ revision: aRevision('r2') })],
    ['fingerprints', () => ({ fingerprints: [aFingerprint()] })],
  ])('keeps the %s it is given', (_field, makeFields) => {
    const fields = makeFields()

    expect(aFingerprintsFile(fields)).toMatchObject(fields)
  })
})
