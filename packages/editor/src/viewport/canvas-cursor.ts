import { inject } from '@keeb-cad/di'
import { Option } from '@keeb-cad/result'
import { shallowRef } from 'vue'

import type { CanvasSize, CursorSample, Point } from './types'
import { Viewport } from './viewport'
import { screenToModel } from './viewport-transform'

// The pointer is held in screen space, so a pan or fit under a still pointer moves the model
// point it reads.
export class CanvasCursor {
  get model(): Option<Point> {
    return this.#sample.value.map(({ screen, size }) =>
      screenToModel(screen, this.#viewport.value, size),
    )
  }

  point(screen: Point, size: CanvasSize): void {
    this.#sample.value = Option.some({ screen, size })
  }

  leave(): void {
    this.#sample.value = Option.none()
  }

  readonly #viewport = inject(Viewport)
  readonly #sample = shallowRef<Option<CursorSample>>(Option.none())
}
