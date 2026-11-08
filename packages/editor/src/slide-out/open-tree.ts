import { emptyInputSchema, type EmptyInput } from '@keeb-cad/commands'
import { inject } from '@keeb-cad/di'

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

  apply(_input: EmptyInput): void {
    this.#slideOut.open()
  }

  readonly #slideOut = inject(SlideOut)
}
