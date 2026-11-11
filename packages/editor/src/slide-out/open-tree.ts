import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import type { UiAction } from '../ui-actions/types'
import { SlideOut } from './slide-out'

export class OpenTree implements UiAction<EmptyInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'slideOut.openTree'
  static readonly label = 'Open tree'
  static readonly input = emptyInputSchema
  static readonly hotkeys = ['T']

  available(): boolean {
    return !this.#slideOut.isOpen
  }

  apply(_input: EmptyInput): AsyncResult<void, Rejection> {
    this.#slideOut.open()
    return AsyncResult.ok()
  }

  readonly #slideOut = inject(SlideOut)
}
