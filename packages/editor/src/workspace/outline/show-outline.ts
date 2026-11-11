import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { DesignLocation } from '../../router/design-location'
import type { UiAction } from '../../ui-actions/types'

export class ShowOutline implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'workspace.showOutline'
  static readonly label = 'Outline'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['2'] as const

  // Off a design route there is no design to show it for.
  available(): boolean {
    return this.#location.workspace.map((open) => open !== 'outline').getOr(false)
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    void this.#location.openWorkspace('outline')
    return AsyncResult.ok()
  }

  readonly #location = inject(DesignLocation)
}
