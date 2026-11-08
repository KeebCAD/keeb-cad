import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'

import type { UiAction } from '../ui-actions/types'
import { Landmarks } from './landmarks'

export class FocusNextLandmark implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'landmarks.focusNextLandmark'
  static readonly label = 'Next landmark'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['F6']

  available(): boolean {
    return true
  }

  apply(_input: EmptyInput): void {
    this.#landmarks.focusNext()
  }

  readonly #landmarks = inject(Landmarks)
}
