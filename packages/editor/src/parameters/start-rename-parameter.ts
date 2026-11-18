import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { Flows } from '../flows/flows'
import type { UiAction } from '../ui-actions/types'
import { FocusedParameter } from './focused-parameter'
import { RenameParameterFlow } from './rename-parameter-flow'
import { startRenameParameterInputSchema } from './start-rename-parameter-input-schema'
import type { StartRenameParameterInput } from './types'

// F2 renames the parameter whose name has focus; a double-click passes the name it was on, which
// its first press focused.
export class StartRenameParameter implements UiAction<StartRenameParameterInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'parameters.startRenameParameter'
  static readonly label = 'Rename parameter'
  static readonly input = startRenameParameterInputSchema
  static readonly hotkeys = ['F2'] as const

  available(): boolean {
    return this.#focused.name.isSome()
  }

  apply({ name }: StartRenameParameterInput): AsyncResult<void, Rejection> {
    const from = name ?? this.#focused.name.getOrUndefined()
    if (from === undefined) {
      return AsyncResult.err({ kind: 'unavailable', command: StartRenameParameter.id })
    }
    this.#flows.start(RenameParameterFlow, { from, to: from })
    return AsyncResult.ok()
  }

  readonly #flows = inject(Flows)
  readonly #focused = inject(FocusedParameter)
}
