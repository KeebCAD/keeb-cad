import { AddSlot, type AddSlotInput } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { InvariantError } from '@keeb-cad/result'
import type { Component } from 'vue'

import type { Flow } from '../flows/types'
import { Selection } from '../selection/selection'
import { addedNodeId } from './added-node-id'
import AddFlowView from './AddFlowView.vue'

export class AddSlotFlow implements Flow<AddSlotInput> {
  static readonly kind = 'flow'
  static readonly finishesWith = AddSlot
  // Typed as a component: the view's props name this class, which would otherwise be circular.
  static readonly view: Component = AddFlowView

  finished(input: AddSlotInput): void {
    const design = this.#store.current.map((committed) => committed.design)
    if (design.isNone()) throw new InvariantError('The add flow finished with no design open.')
    this.#selection.select([addedNodeId(design.value, input)])
  }

  readonly #selection = inject(Selection)
  readonly #store = inject(DesignStore)
}
