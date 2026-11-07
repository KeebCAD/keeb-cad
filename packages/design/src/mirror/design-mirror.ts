import { inject } from '@keeb-cad/di'
import { InvariantError } from '@keeb-cad/result'
import type { Design, Frozen, Revision } from '@keeb-cad/schema'

import { MirrorState } from './mirror-state'
import type { Mirrored } from './types'

export class DesignMirror {
  get value(): Frozen<Design> {
    return this.#loaded().design
  }

  get revision(): Revision {
    return this.#loaded().revision
  }

  readonly #state = inject(MirrorState)

  #loaded(): Mirrored {
    const current = this.#state.current.value
    // Main sends the whole design before anything else, so nothing reads an empty mirror.
    if (current === undefined) {
      throw new InvariantError('The design mirror was read before its first whole design.')
    }
    return current
  }
}
