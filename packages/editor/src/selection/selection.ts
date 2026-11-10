import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { subtreeIds } from '@keeb-cad/model/main'
import type { Id } from '@keeb-cad/schema'
import { shallowRef } from 'vue'

export class Selection implements Disposable {
  // In selection order.
  get ids(): readonly Id[] {
    return this.#ids.value
  }

  select(ids: readonly Id[]): void {
    this.#ids.value = [...ids]
  }

  [Symbol.dispose](): void {
    this.#stopPruning()
  }

  readonly #store = inject(DesignStore)
  readonly #ids = shallowRef<readonly Id[]>([])
  readonly #stopPruning = this.#store.events.on('commit', () => {
    this.#prune()
  })

  #prune(): void {
    const design = this.#store.current.map(({ design }) => design).getOrUndefined()
    const held = new Set<string>(design === undefined ? [] : subtreeIds(design.layout))
    const kept = this.#ids.value.filter((id) => held.has(id))
    if (kept.length !== this.#ids.value.length) this.#ids.value = kept
  }
}
