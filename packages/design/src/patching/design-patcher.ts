import { Option, Result } from '@keeb-cad/result'
import type { Design, DesignPatch, Frozen, Rejection } from '@keeb-cad/schema'
import { enablePatches, Immer } from 'immer'

import type { Changed, Edit } from './types'

export class DesignPatcher {
  constructor() {
    // Immer has no per-instance switch for patches.
    enablePatches()
  }

  change(design: Frozen<Design>, edit: Edit): Result<Changed, Rejection> {
    let rejection: Option<Rejection> = Option.none()
    const [next, patches] = this.#immer.produceWithPatches(design, (draft) => {
      const outcome = edit(draft)
      if (outcome !== undefined) rejection = Option.some(outcome)
    })
    return rejection.match<Result<Changed, Rejection>>({
      some: (refused) => Result.err(refused),
      none: () => Result.ok({ design: next, patches }),
    })
  }

  apply(design: Frozen<Design>, patches: readonly DesignPatch[]): Frozen<Design> {
    return this.#immer.applyPatches(design, patches)
  }

  readonly #immer = new Immer({ autoFreeze: true })
}
