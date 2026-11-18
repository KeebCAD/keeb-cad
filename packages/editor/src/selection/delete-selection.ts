import {
  DeleteNode,
  type DeleteNodeInput,
  DeleteParameter,
  type DeleteParameterInput,
  emptyInputSchema,
  type EmptyInput,
} from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { nodeIdOf } from '@keeb-cad/model/main'
import { AsyncResult, Option } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { Invoke } from '../invoke/invoke'
import { Landmarks } from '../landmarks/landmarks'
import { FocusedParameter } from '../parameters/focused-parameter'
import { DesignLocation } from '../router/design-location'
import { SlideOut } from '../slide-out/slide-out'
import type { UiAction } from '../ui-actions/types'
import { actsOnSelection } from './acts-on-selection'
import { Selection } from './selection'
import { selectsRightHalf } from './selects-right-half'

export class DeleteSelection implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'selection.deleteSelection'
  static readonly label = 'Delete'
  static readonly input = emptyInputSchema
  // A Mac laptop's delete key sends Backspace.
  static readonly hotkeys = ['Delete', 'Backspace'] as const

  // A focused parameter is available even while its delete is refused: the key then shows the
  // refusal under its row, where a silent key would tell the person nothing.
  available(): boolean {
    return (
      this.#parameterInput().isSome() ||
      this.#nodeInput()
        .map((input) => this.#invoke.available(DeleteNode, input).isOk())
        .getOr(false)
    )
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    const parameter = this.#parameterInput()
    if (parameter.isSome()) return this.#invoke.invoke(DeleteParameter, parameter.value)
    return this.#nodeInput().match({
      some: (input) => this.#invoke.invoke(DeleteNode, input),
      none: () => AsyncResult.err({ kind: 'unavailable', command: DeleteSelection.id }),
    })
  }

  readonly #invoke = inject(Invoke)
  readonly #landmarks = inject(Landmarks)
  readonly #location = inject(DesignLocation)
  readonly #selection = inject(Selection)
  readonly #slideOut = inject(SlideOut)
  readonly #focusedParameter = inject(FocusedParameter)

  #parameterInput(): Option<DeleteParameterInput> {
    const onParameters =
      this.#landmarks
        .focusedPlace()
        .map((place) => place === 'slide-out')
        .getOr(false) && this.#slideOut.tab === 'parameters'
    return onParameters ? this.#focusedParameter.name.map((name) => ({ name })) : Option.none()
  }

  #nodeInput(): Option<DeleteNodeInput> {
    const ids = this.#selection.ids
    const acts = actsOnSelection(
      this.#landmarks.focusedPlace(),
      this.#location.workspace,
      this.#slideOut.tab,
    )
    return acts && ids.length > 0 && !selectsRightHalf(ids)
      ? Option.some({ ids: ids.map(nodeIdOf) })
      : Option.none()
  }
}
