import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import type { UiAction } from '../ui-actions/types'
import { SlideOut } from './slide-out'

export class ToggleSlideOut implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'slideOut.toggleSlideOut'
  static readonly label = 'Toggle slide-out'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['T']

  available(): boolean {
    return true
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    if (this.#slideOut.isOpen) this.#slideOut.close()
    else this.#slideOut.open()
    return AsyncResult.ok()
  }

  readonly #slideOut = inject(SlideOut)
}
