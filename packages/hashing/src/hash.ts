import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

import { encodeCanonical } from './canonical-encoding'

export function hash(value: unknown): string {
  return bytesToHex(sha256(utf8ToBytes(encodeCanonical(value))))
}
