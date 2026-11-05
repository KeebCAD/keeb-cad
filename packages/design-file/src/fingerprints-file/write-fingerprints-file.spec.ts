import { fingerprintsFileSchema } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { writeFingerprintsFile } from './write-fingerprints-file'

describe('writeFingerprintsFile', () => {
  it('writes an empty fingerprints file as its revision node and a bare fingerprints node', () => {
    const fingerprints = v.parse(fingerprintsFileSchema, { revision: 'r1', fingerprints: [] })

    expect(writeFingerprintsFile(fingerprints)).toBe('revision "r1"\nfingerprints\n')
  })

  it('writes each fingerprint as a fingerprint node inside the fingerprints node', () => {
    const fingerprints = v.parse(fingerprintsFileSchema, {
      revision: 'r1',
      fingerprints: [
        { id: 'choc-key', slice: 's1', outputs: 'o1' },
        { id: 'oled', slice: 's2', outputs: 'o2' },
      ],
    })

    expect(writeFingerprintsFile(fingerprints)).toBe(
      'revision "r1"\nfingerprints {\n    fingerprint id="choc-key" slice="s1" outputs="o1"\n    fingerprint id="oled" slice="s2" outputs="o2"\n}\n',
    )
  })
})
