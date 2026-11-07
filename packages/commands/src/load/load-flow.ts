import { checkDesign, DesignStore, emptiedFiles } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { AsyncResult, attempt } from '@keeb-cad/result'
import type { Id } from '@keeb-cad/schema'
import { DesignStorage, type LoadedBundle } from '@keeb-cad/storage'

import type { LoadFlowError, LoadOutcome } from './types'

// Every path that opens a stored bundle runs through here: storage's load, then replaceDesign.
export class LoadFlow {
  load(id: Id): AsyncResult<LoadOutcome, LoadFlowError> {
    return attempt.in(this, async function* () {
      const loaded = yield* this.#storage.load(id)
      // A design replaceDesign refuses replaces nothing, so it needs no reset point.
      yield* checkDesign(loaded.migrated)
      yield* this.#keepResetPoint(loaded)
      const { emptied } = yield* this.#store.replaceDesign(loaded.migrated)
      return { emptied }
    })
  }

  readonly #storage = inject(DesignStorage)
  readonly #store = inject(DesignStore)

  // A derived file that was saved but can't be used would be emptied, and the autosave inside
  // replaceDesign would then replace it, so the bundle as read is kept first. A missing file
  // needs none: nothing was saved.
  #keepResetPoint(loaded: LoadedBundle): AsyncResult<void, LoadFlowError> {
    const needed = emptiedFiles(loaded.migrated).some(({ reason }) => reason !== 'missing')
    return needed ? this.#storage.save(loaded.label, loaded.asRead, 'reset') : AsyncResult.ok()
  }
}
