import { shallowRef } from '@keeb-cad/reactive'

import type { Mirrored } from './types'

// Shared by the mirror, which reads it, and its writer, which alone assigns it.
export class MirrorState {
  readonly current = shallowRef<Mirrored | undefined>(undefined)
}
