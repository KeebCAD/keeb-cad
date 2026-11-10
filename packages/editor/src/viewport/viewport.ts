import type { Id } from '@keeb-cad/schema'
import { shallowRef } from 'vue'

import { fitPaddingPx } from './fit-padding'
import { fitViewport } from './fit-viewport'
import type { Bounds, CanvasSize, Point, ViewportValue } from './types'

export class Viewport {
  static readonly initial: ViewportValue = { centre: { x: 0, y: 0 }, zoom: 4 }

  get centre(): Point {
    return this.#value.value.centre
  }

  get zoom(): number {
    return this.#value.value.zoom
  }

  get value(): ViewportValue {
    return this.#value.value
  }

  setCentre(centre: Point): void {
    this.#value.value = { ...this.#value.value, centre: { ...centre } }
  }

  setZoom(zoom: number): void {
    this.#value.value = { ...this.#value.value, zoom }
  }

  // A fit that can't run (no extent, a canvas too small) leaves the design unfitted, so the next
  // call for it may fit.
  fitOnce(designId: Id, bounds: Bounds, size: CanvasSize): void {
    if (this.#fittedFor === designId) return
    const fitted = fitViewport(bounds, size, fitPaddingPx)
    if (fitted.isNone()) return
    this.#value.value = fitted.value
    this.#fittedFor = designId
  }

  readonly #value = shallowRef<ViewportValue>(Viewport.initial)
  #fittedFor: Id | undefined
}
