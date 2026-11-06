import type { Fingerprint } from '../types'
import { aHash } from './hash'
import { anId } from './id'

export function aFingerprint({
  id = anId(),
  slice = aHash('slice'),
  outputs = aHash('outputs'),
}: Partial<Fingerprint> = {}): Fingerprint {
  return { id, slice, outputs }
}
