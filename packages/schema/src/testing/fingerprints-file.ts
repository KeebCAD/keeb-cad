import type { FingerprintsFile } from '../types'
import { aRevision } from './revision'

export function aFingerprintsFile({
  revision = aRevision(),
  fingerprints = [],
}: Partial<FingerprintsFile> = {}): FingerprintsFile {
  return { revision, fingerprints }
}
