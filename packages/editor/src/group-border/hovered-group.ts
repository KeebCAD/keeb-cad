import { Option } from '@keeb-cad/result'
import type { Id } from '@keeb-cad/schema'
import { useTimeoutFn } from '@vueuse/core'
import { effectScope, shallowRef } from 'vue'

import { hoverGraceDelayMs } from './hover-grace-delay'
import type { HoverSource } from './types'

// The group the pointer is at, through a key, a border, a tab or a Tree row; a node id, so both
// halves of a group show together.
export class HoveredGroup implements Disposable {
  get id(): Option<Id> {
    return this.#id.value
  }

  // Entering a source replaces the hovered group and cancels a pending clear.
  point(id: Id, by: HoverSource): void {
    this.#timer.stop()
    this.#setBy = by
    if (this.#id.value.getOrUndefined() !== id) this.#id.value = Option.some(id)
  }

  // The group stays for the grace, so the pointer can still reach its tab; a further leave while
  // it runs, such as crossing a slot's row, does not push the clear back.
  leave(): void {
    if (!this.#timer.isPending.value) this.#timer.start()
  }

  clear(): void {
    this.#timer.stop()
    this.#id.value = Option.none()
  }

  // A surface that goes away takes its own hover with it, shown or within the grace, never
  // another surface's.
  clearSetBy(by: HoverSource): void {
    if (this.#setBy === by) this.clear()
  }

  [Symbol.dispose](): void {
    this.#scope.stop()
  }

  readonly #id = shallowRef<Option<Id>>(Option.none())
  #setBy: HoverSource = 'canvas'
  // Detached: the service is first resolved inside some component's setup, and a scope of that
  // component's would stop the timer when it unmounts.
  readonly #scope = effectScope(true)
  readonly #timer = this.#runInScope(() =>
    useTimeoutFn(
      () => {
        this.#id.value = Option.none()
      },
      hoverGraceDelayMs,
      { immediate: false },
    ),
  )

  #runInScope<T>(run: () => T): T {
    const result = this.#scope.run(run)
    if (result === undefined) throw new Error('The scope ran nothing.')
    return result
  }
}
