import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { DesignLocation } from '../../router/design-location'
import type { UiAction } from '../../ui-actions/types'

export class ShowCase implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'workspace.showCase'
  static readonly label = 'Case'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['4'] as const

  // Off a design route there is no design to show it for.
  available(): boolean {
    return this.#location.workspace.map((open) => open !== 'case').getOr(false)
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    void this.#location.openWorkspace('case')
    return AsyncResult.ok()
  }

  readonly #location = inject(DesignLocation)
}
