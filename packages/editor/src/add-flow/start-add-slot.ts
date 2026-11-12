import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { AsyncResult, Option } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import { Flows } from '../flows/flows'
import type { FlowDraft } from '../flows/types'
import { Landmarks } from '../landmarks/landmarks'
import { DesignLocation } from '../router/design-location'
import { actsOnSelection } from '../selection/acts-on-selection'
import { Selection } from '../selection/selection'
import type { UiAction } from '../ui-actions/types'
import { AddSlotFlow } from './add-slot-flow'
import { parentForSelection } from './parent-for-selection'

export class StartAddSlot implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'addFlow.startAddSlot'
  static readonly label = 'Add slot'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['S'] as const

  available(): boolean {
    return this.#draft().isSome()
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    return this.#draft().match({
      some: (draft): AsyncResult<void, Rejection> => {
        this.#flows.start(AddSlotFlow, draft)
        return AsyncResult.ok()
      },
      none: () => AsyncResult.err({ kind: 'unavailable', command: StartAddSlot.id }),
    })
  }

  readonly #flows = inject(Flows)
  readonly #landmarks = inject(Landmarks)
  readonly #location = inject(DesignLocation)
  readonly #selection = inject(Selection)
  readonly #store = inject(DesignStore)

  #draft(): Option<FlowDraft<typeof AddSlotFlow>> {
    if (!actsOnSelection(this.#landmarks.focusedPlace(), this.#location.workspace)) {
      return Option.none()
    }
    return this.#store.current.map(({ design }) => ({
      parent: parentForSelection(design, this.#selection.ids),
    }))
  }
}
