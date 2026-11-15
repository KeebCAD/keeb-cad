import { Option } from '@keeb-cad/result'
import type { PlacementId } from '@keeb-cad/schema'
import { shallowRef, triggerRef } from 'vue'

import { cornersIn } from './corners-in'
import type { Bounds, CanvasItem, CanvasRoot, CanvasSize } from './types'

// The drawn elements of the canvas by placement id, measured by the browser: a canvas computes no
// geometry of its own. Registrations are reactive, so a measurement read in an effect is read again
// once a key mounted in the same flush registers.
export class CanvasItems {
  registerRoot(root: CanvasRoot): void {
    this.#root = root
    triggerRef(this.#changed)
  }

  unregisterRoot(root: CanvasRoot): void {
    if (this.#root?.svg !== root.svg) return
    this.#root = undefined
    triggerRef(this.#changed)
  }

  register(item: CanvasItem): void {
    this.#items.add(item)
    triggerRef(this.#changed)
  }

  unregister(item: CanvasItem): void {
    this.#items.delete(item)
    triggerRef(this.#changed)
  }

  get drawsAny(): boolean {
    this.#track()
    return this.#root !== undefined && this.#items.size > 0
  }

  // The union of every registered element of these ids, in model mm; none when none is drawn.
  bounds(ids: readonly PlacementId[]): Option<Bounds> {
    this.#track()
    const wanted = new Set<string>(ids)
    return this.#union([...this.#items].filter(({ id }) => wanted.has(id)))
  }

  allBounds(): Option<Bounds> {
    this.#track()
    return this.#union([...this.#items])
  }

  size(): Option<CanvasSize> {
    this.#track()
    return Option.fromNullable(this.#root).map(({ svg }) => {
      const { width, height } = svg.getBoundingClientRect()
      return { width, height }
    })
  }

  #root: CanvasRoot | undefined = undefined
  readonly #items = new Set<CanvasItem>()
  // Registering only triggers it, never reads it, so the effect that registers a key does not track
  // its own registration.
  readonly #changed = shallowRef()

  #union(items: readonly CanvasItem[]): Option<Bounds> {
    return Option.fromNullable(this.#root).flatMap(({ keys }) => {
      const toKeys = keys.getCTM()?.inverse()
      if (toKeys === undefined || items.length === 0) return Option.none()
      const corners = items.flatMap(({ element }) => cornersIn(element, toKeys))
      if (corners.length === 0) return Option.none()
      const xs = corners.map(({ x }) => x)
      const ys = corners.map(({ y }) => y)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      return Option.some({ x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y })
    })
  }

  #track(): void {
    void this.#changed.value
  }
}
