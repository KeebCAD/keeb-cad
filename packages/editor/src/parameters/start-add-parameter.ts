import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { Flows } from '../flows/flows'
import type { UiAction } from '../ui-actions/types'
import { AddParameterFlow } from './add-parameter-flow'

export class StartAddParameter implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'parameters.startAddParameter'
  static readonly label = 'Add parameter'
  static readonly input = emptyInputSchema

  available(): boolean {
    return this.#store.current.isSome()
  }

  // Both fields start empty, so finish is refused with the first field's reason until both parse.
  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    this.#flows.start(AddParameterFlow, { name: '', value: '' })
    return AsyncResult.ok()
  }

  readonly #flows = inject(Flows)
  readonly #store = inject(DesignStore)
}
