import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { shallowRef } from '@keeb-cad/reactive'
import { Option } from '@keeb-cad/result'
import { DesignStorage, type SaveError, writeBundle } from '@keeb-cad/storage'

// Saves the design bundle as it is at each commit and accept, never waiting for the worker.
export class Autosave {
  constructor() {
    this.#store.events.on('commit', () => this.#save())
    this.#store.events.on('accept', () => this.#save())
  }

  // The last save's error, until a later save succeeds.
  get failure(): Option<SaveError> {
    return Option.fromNullable(this.#failure.value)
  }

  readonly #store = inject(DesignStore)
  readonly #storage = inject(DesignStorage)
  readonly #failure = shallowRef<SaveError | undefined>(undefined)

  #save(): void {
    const current = this.#store.current
    if (current.isNone()) return
    const { design, revision } = current.value
    const label = { id: design.meta.id, name: design.meta.name, revision }
    void this.#storage.save(label, writeBundle(current.value), 'autosave').match({
      ok: () => {
        this.#failure.value = undefined
      },
      err: (error) => {
        this.#failure.value = error
      },
    })
  }
}
