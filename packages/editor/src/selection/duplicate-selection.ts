import { DesignStore } from '@keeb-cad/design'
import {
  DuplicateNode,
  type DuplicateNodeInput,
  emptyInputSchema,
  type EmptyInput,
} from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { nextSiblingId } from '@keeb-cad/model/main'
import { AsyncResult, InvariantError, Option } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { Invoke } from '../invoke/invoke'
import { Landmarks } from '../landmarks/landmarks'
import { DesignLocation } from '../router/design-location'
import type { UiAction } from '../ui-actions/types'
import { actsOnSelection } from './acts-on-selection'
import { Selection } from './selection'

export class DuplicateSelection implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'selection.duplicateSelection'
  static readonly label = 'Duplicate'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['mod+D'] as const

  available(): boolean {
    return this.#input()
      .map((input) => this.#invoke.available(DuplicateNode, input))
      .getOr(false)
  }

  // Selects the copy, which DuplicateNode inserts right after the original.
  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    return this.#input().match({
      some: (input) =>
        this.#invoke.invoke(DuplicateNode, input).tap(() => {
          this.#selection.select([this.#copyOf(input.id)])
        }),
      none: () => AsyncResult.err({ kind: 'unavailable', command: DuplicateSelection.id }),
    })
  }

  readonly #invoke = inject(Invoke)
  readonly #landmarks = inject(Landmarks)
  readonly #location = inject(DesignLocation)
  readonly #selection = inject(Selection)
  readonly #store = inject(DesignStore)

  // Only one node at a time until multi-node duplicate.
  #input(): Option<DuplicateNodeInput> {
    const [id, ...others] = this.#selection.ids
    const acts = actsOnSelection(this.#landmarks.focusedPlace(), this.#location.workspace)
    return acts && id !== undefined && others.length === 0 ? Option.some({ id }) : Option.none()
  }

  #copyOf(original: DuplicateNodeInput['id']): DuplicateNodeInput['id'] {
    const copy = this.#store.current.flatMap(({ design }) => nextSiblingId(design.layout, original))
    if (copy.isNone()) {
      throw new InvariantError(`DuplicateNode committed no copy after "${original}".`)
    }
    return copy.value
  }
}
