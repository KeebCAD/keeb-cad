import { type FingerprintsFile, fingerprintsFileSchema, type Frozen } from '@keeb-cad/schema'

import { writeKdl } from '../codec/write-kdl'

export function writeFingerprintsFile(fingerprints: Frozen<FingerprintsFile>): string {
  return writeKdl(fingerprintsFileSchema, fingerprints)
}
