import { inject } from '@keeb-cad/di'
import { InvariantError } from '@keeb-cad/result'
import type { Design, DesignPatch, Frozen, Revision } from '@keeb-cad/schema'

import { deepFreeze } from '../patching/deep-freeze'
import { DesignPatcher } from '../patching/design-patcher'
import { MirrorState } from './mirror-state'

export class DesignMirrorWriter {
  replace(design: Frozen<Design>, revision: Revision): void {
    this.#state.current.value = { design: deepFreeze(design), revision }
  }

  apply(patches: readonly DesignPatch[], revision: Revision): void {
    const current = this.#state.current.value
    if (current === undefined) {
      throw new InvariantError('Patches reached the design mirror before its first whole design.')
    }
    this.#state.current.value = { design: this.#patcher.apply(current.design, patches), revision }
  }

  readonly #state = inject(MirrorState)
  readonly #patcher = inject(DesignPatcher)
}
