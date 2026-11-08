import { Option } from '@keeb-cad/result'

import type { LandmarkName, LandmarkPlace, LandmarkTarget } from './types'

export class Landmarks {
  register(place: LandmarkPlace, root: HTMLElement): void {
    this.#roots.set(place, root)
  }

  unregister(place: LandmarkPlace, root: HTMLElement): void {
    if (this.#roots.get(place) === root) this.#roots.delete(place)
  }

  root(name: LandmarkName): Option<HTMLElement> {
    return Option.fromNullable(this.#roots.get(name))
  }

  // From outside every place, the first landmark.
  focusNext(): void {
    const targets = this.#targets()
    const at = this.#focusedPlace()
    const next = at === -1 ? undefined : targets.find(({ index }) => index > at)
    const target = next ?? targets[0]
    target?.root.focus()
  }

  // From outside every place, the last landmark.
  focusPrevious(): void {
    const targets = this.#targets()
    const at = this.#focusedPlace()
    const previous = at === -1 ? undefined : targets.findLast(({ index }) => index < at)
    const target = previous ?? targets.at(-1)
    target?.root.focus()
  }

  // The rail sits just before the slide-out, so from it F6 reaches the slide-out when open.
  static readonly #places: readonly LandmarkPlace[] = [
    'top-bar',
    'left-rail',
    'slide-out',
    'canvas',
    'inspector',
    'status-strip',
  ]

  readonly #roots = new Map<LandmarkPlace, HTMLElement>()

  #targets(): LandmarkTarget[] {
    return Landmarks.#places.flatMap((place, index) => {
      const root = this.#roots.get(place)
      return place === 'left-rail' || root === undefined ? [] : [{ index, root }]
    })
  }

  #focusedPlace(): number {
    const focused = document.activeElement
    return Landmarks.#places.findIndex(
      (place) => this.#roots.get(place)?.contains(focused) === true,
    )
  }
}
