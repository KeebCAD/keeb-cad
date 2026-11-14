import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { holdsPlacement } from '@keeb-cad/model/main'
import type { PlacementId } from '@keeb-cad/schema'
import { shallowRef } from 'vue'

export class Selection implements Disposable {
  // In selection order.
  get ids(): readonly PlacementId[] {
    return this.#ids.value
  }

  select(ids: readonly PlacementId[]): void {
    this.#ids.value = [...ids]
  }

  [Symbol.dispose](): void {
    this.#stopPruning()
  }

  readonly #store = inject(DesignStore)
  readonly #ids = shallowRef<readonly PlacementId[]>([])
  readonly #stopPruning = this.#store.events.on('commit', () => {
    this.#prune()
  })

  #prune(): void {
    const design = this.#store.current.map(({ design }) => design).getOrUndefined()
    const kept = this.#ids.value.filter((id) => design !== undefined && holdsPlacement(design, id))
    if (kept.length !== this.#ids.value.length) this.#ids.value = kept
  }
}
