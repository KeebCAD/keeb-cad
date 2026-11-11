import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import type { UiAction } from '../ui-actions/types'
import { SlideOut } from './slide-out'

export class CloseSlideOut implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'slideOut.closeSlideOut'
  static readonly label = 'Close slide-out'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['Escape']

  available(): boolean {
    return this.#slideOut.isOpen
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    this.#slideOut.close()
    return AsyncResult.ok()
  }

  readonly #slideOut = inject(SlideOut)
}
