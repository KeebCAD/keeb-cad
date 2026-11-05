import type { Result } from '@keeb-cad/result'
import { fingerprintsFileSchema } from '@keeb-cad/schema'

import { parseKdl } from '../codec/parse-kdl'
import { readKdl } from '../codec/read-kdl'

export function readFingerprintsFile(text: string): Result<unknown, string> {
  return parseKdl(text).flatMap((document) => readKdl(fingerprintsFileSchema, document.nodes))
}
