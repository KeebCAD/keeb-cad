import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'

import { DesignLocation } from '../../router/design-location'
import type { UiAction } from '../../ui-actions/types'

export class ShowLayout implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'workspace.showLayout'
  static readonly label = 'Layout'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['1'] as const

  // Off a design route there is no design to show it for.
  available(): boolean {
    return this.#location.workspace.map((open) => open !== 'layout').getOr(false)
  }

  apply(_input: EmptyInput): void {
    void this.#location.openWorkspace('layout')
  }

  readonly #location = inject(DesignLocation)
}
