import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { holdsPlacement } from '@keeb-cad/model/main'
import { Option } from '@keeb-cad/result'
import type { PlacementId } from '@keeb-cad/schema'
import { useTimeoutFn } from '@vueuse/core'
import { effectScope, shallowRef } from 'vue'

import { hoverGraceDelayMs } from './hover-grace-delay'
import type { HoverSource } from './types'

// The node the pointer is at, a key, or a group through its border, tab or Tree row, on one side.
export class HoveredNode implements Disposable {
  get id(): Option<PlacementId> {
    return Option.fromNullable(this.#id.value)
  }

  // Entering a source replaces the hovered node and cancels a pending clear.
  point(id: PlacementId, by: HoverSource): void {
    this.#timer.stop()
    this.#setBy = by
    this.#id.value = id
  }

  // The node stays for the grace, so the pointer can still reach its group's tab; a further leave
  // while it runs, such as crossing a slot's row, does not push the clear back.
  leave(): void {
    if (!this.#timer.isPending.value) this.#timer.start()
  }

  clear(): void {
    this.#timer.stop()
    this.#id.value = undefined
  }

  // A surface that goes away takes its own hover with it, shown or within the grace, never
  // another surface's.
  clearSetBy(by: HoverSource): void {
    if (this.#setBy === by) this.clear()
  }

  [Symbol.dispose](): void {
    this.#stopPruning()
    this.#scope.stop()
  }

  readonly #store = inject(DesignStore)
  readonly #id = shallowRef<PlacementId | undefined>(undefined)
  #setBy: HoverSource = 'canvas'
  // Detached: the service is first resolved inside some component's setup, and a scope of that
  // component's would stop the timer when it unmounts.
  readonly #scope = effectScope(true)
  readonly #timer = this.#runInScope(() =>
    useTimeoutFn(
      () => {
        this.#id.value = undefined
      },
      hoverGraceDelayMs,
      { immediate: false },
    ),
  )
  // Nothing fires when a node goes away under a still pointer, so a commit drops it at once.
  readonly #stopPruning = this.#store.events.on('commit', () => {
    this.#prune()
  })

  #prune(): void {
    const id = this.#id.value
    if (id === undefined) return
    const design = this.#store.current.map(({ design }) => design).getOrUndefined()
    if (design === undefined || !holdsPlacement(design, id)) this.clear()
  }

  #runInScope<T>(run: () => T): T {
    const result = this.#scope.run(run)
    if (result === undefined) throw new Error('The scope ran nothing.')
    return result
  }
}
