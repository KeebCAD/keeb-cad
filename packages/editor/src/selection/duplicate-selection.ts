import { DesignStore } from '@keeb-cad/design'
import {
  DuplicateNode,
  type DuplicateNodeInput,
  emptyInputSchema,
  type EmptyInput,
} from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { nextSiblingId, nodeIdOf, sideOf, sideQualifiedId } from '@keeb-cad/model/main'
import { AsyncResult, InvariantError, Option } from '@keeb-cad/result'
import type { Id, PlacementId, Rejection } from '@keeb-cad/schema'

import { Invoke } from '../invoke/invoke'
import { Landmarks } from '../landmarks/landmarks'
import { DesignLocation } from '../router/design-location'
import type { UiAction } from '../ui-actions/types'
import { actsOnSelection } from './acts-on-selection'
import { Selection } from './selection'
import { selectsRightHalf } from './selects-right-half'

export class DuplicateSelection implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'selection.duplicateSelection'
  static readonly label = 'Duplicate'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['mod+D'] as const

  available(): boolean {
    return this.#original()
      .map((original) => this.#invoke.available(DuplicateNode, this.#inputOf(original)).isOk())
      .getOr(false)
  }

  // Selects the copy, which DuplicateNode inserts right after the original, on the original's side.
  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    return this.#original().match({
      some: (original) => {
        const input = this.#inputOf(original)
        return this.#invoke.invoke(DuplicateNode, input).tap(() => {
          this.#selection.select([sideQualifiedId(sideOf(original), this.#copyOf(input.id))])
        })
      },
      none: () => AsyncResult.err({ kind: 'unavailable', command: DuplicateSelection.id }),
    })
  }

  readonly #invoke = inject(Invoke)
  readonly #landmarks = inject(Landmarks)
  readonly #location = inject(DesignLocation)
  readonly #selection = inject(Selection)
  readonly #store = inject(DesignStore)

  // Only one node at a time until multi-node duplicate.
  #original(): Option<PlacementId> {
    const ids = this.#selection.ids
    const [id, ...others] = ids
    const acts = actsOnSelection(this.#landmarks.focusedPlace(), this.#location.workspace)
    return acts && id !== undefined && others.length === 0 && !selectsRightHalf(ids)
      ? Option.some(id)
      : Option.none()
  }

  #inputOf(original: PlacementId): DuplicateNodeInput {
    return { id: nodeIdOf(original) }
  }

  #copyOf(original: Id): Id {
    const copy = this.#store.current.flatMap(({ design }) => nextSiblingId(design.layout, original))
    if (copy.isNone()) {
      throw new InvariantError(`DuplicateNode committed no copy after "${original}".`)
    }
    return copy.value
  }
}
