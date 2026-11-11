import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { DesignLocation } from '../router/design-location'
import { Selection } from '../selection/selection'
import type { UiAction } from '../ui-actions/types'
import { CanvasItems } from './canvas-items'
import { Viewport } from './viewport'

export class FitViewport implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'viewport.fitViewport'
  static readonly label = 'Fit the viewport'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['F'] as const

  // Only Layout draws so far, and with nothing drawn there is nothing to fit.
  available(): boolean {
    const onLayout = this.#location.workspace.map((open) => open === 'layout').getOr(false)
    return onLayout && this.#items.drawsAny
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    this.#viewport.fitNodes(this.#selection.ids)
    return AsyncResult.ok()
  }

  readonly #location = inject(DesignLocation)
  readonly #items = inject(CanvasItems)
  readonly #selection = inject(Selection)
  readonly #viewport = inject(Viewport)
}
