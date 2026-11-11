import {
  DeleteNode,
  type DeleteNodeInput,
  emptyInputSchema,
  type EmptyInput,
} from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { AsyncResult, Option } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { Invoke } from '../invoke/invoke'
import { Landmarks } from '../landmarks/landmarks'
import { DesignLocation } from '../router/design-location'
import type { UiAction } from '../ui-actions/types'
import { actsOnSelection } from './acts-on-selection'
import { Selection } from './selection'

export class DeleteSelection implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'selection.deleteSelection'
  static readonly label = 'Delete'
  static readonly input = emptyInputSchema
  // A Mac laptop's delete key sends Backspace.
  static readonly hotkeys = ['Delete', 'Backspace'] as const

  available(): boolean {
    return this.#input()
      .map((input) => this.#invoke.available(DeleteNode, input).isOk())
      .getOr(false)
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    return this.#input().match({
      some: (input) => this.#invoke.invoke(DeleteNode, input),
      none: () => AsyncResult.err({ kind: 'unavailable', command: DeleteSelection.id }),
    })
  }

  readonly #invoke = inject(Invoke)
  readonly #landmarks = inject(Landmarks)
  readonly #location = inject(DesignLocation)
  readonly #selection = inject(Selection)

  #input(): Option<DeleteNodeInput> {
    const ids = this.#selection.ids
    const acts = actsOnSelection(this.#landmarks.focusedPlace(), this.#location.workspace)
    return acts && ids.length > 0 ? Option.some({ ids: [...ids] }) : Option.none()
  }
}
