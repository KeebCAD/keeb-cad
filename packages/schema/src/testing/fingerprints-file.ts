import * as v from 'valibot'

import { revisionSchema } from '../revision'
import type { FingerprintsFile } from '../types'

export function aFingerprintsFile({
  revision = v.parse(revisionSchema, 'r1'),
  fingerprints = [],
}: Partial<FingerprintsFile> = {}): FingerprintsFile {
  return { revision, fingerprints }
}
