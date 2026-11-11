import { Option } from '@keeb-cad/result'
import type { Id } from '@keeb-cad/schema'

import { cornersIn } from './corners-in'
import type { Bounds, CanvasItem, CanvasRoot, CanvasSize } from './types'

// The drawn elements of the canvas by node id, measured by the browser: a canvas computes no
// geometry of its own.
export class CanvasItems {
  registerRoot(root: CanvasRoot): void {
    this.#root = Option.some(root)
  }

  unregisterRoot(root: CanvasRoot): void {
    if (this.#root.getOrUndefined()?.svg === root.svg) this.#root = Option.none()
  }

  // One node may draw several elements: the right half shares the left's node ids.
  register(item: CanvasItem): void {
    this.#items.add(item)
  }

  unregister(item: CanvasItem): void {
    this.#items.delete(item)
  }

  get drawsAny(): boolean {
    return this.#root.isSome() && this.#items.size > 0
  }

  // The union of every registered element of these ids, in model mm; none when none is drawn.
  bounds(ids: readonly Id[]): Option<Bounds> {
    const wanted = new Set<string>(ids)
    return this.#union([...this.#items].filter(({ id }) => wanted.has(id)))
  }

  allBounds(): Option<Bounds> {
    return this.#union([...this.#items])
  }

  size(): Option<CanvasSize> {
    return this.#root.map(({ svg }) => {
      const { width, height } = svg.getBoundingClientRect()
      return { width, height }
    })
  }

  #root: Option<CanvasRoot> = Option.none()
  readonly #items = new Set<CanvasItem>()

  #union(items: readonly CanvasItem[]): Option<Bounds> {
    return this.#root.flatMap(({ keys }) => {
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
}
