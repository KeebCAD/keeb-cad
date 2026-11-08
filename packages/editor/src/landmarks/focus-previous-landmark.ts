import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'

import type { UiAction } from '../ui-actions/types'
import { Landmarks } from './landmarks'

export class FocusPreviousLandmark implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'landmarks.focusPreviousLandmark'
  static readonly label = 'Previous landmark'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['shift+F6']

  available(): boolean {
    return true
  }

  apply(_input: EmptyInput): void {
    this.#landmarks.focusPrevious()
  }

  readonly #landmarks = inject(Landmarks)
}
