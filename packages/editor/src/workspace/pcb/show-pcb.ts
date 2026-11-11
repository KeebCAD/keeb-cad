import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { DesignLocation } from '../../router/design-location'
import type { UiAction } from '../../ui-actions/types'

export class ShowPcb implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'workspace.showPcb'
  static readonly label = 'PCB'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['3'] as const

  // Off a design route there is no design to show it for.
  available(): boolean {
    return this.#location.workspace.map((open) => open !== 'pcb').getOr(false)
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    void this.#location.openWorkspace('pcb')
    return AsyncResult.ok()
  }

  readonly #location = inject(DesignLocation)
}
