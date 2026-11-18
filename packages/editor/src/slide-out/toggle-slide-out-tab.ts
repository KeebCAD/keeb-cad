import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import type { UiAction } from '../ui-actions/types'
import { SlideOut } from './slide-out'
import { toggleSlideOutTabInputSchema } from './toggle-slide-out-tab-input-schema'
import type { ToggleSlideOutTabInput } from './types'

export class ToggleSlideOutTab implements UiAction<ToggleSlideOutTabInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'slideOut.toggleSlideOutTab'
  static readonly label = 'Toggle slide-out tab'
  static readonly input = toggleSlideOutTabInputSchema

  available(): boolean {
    return true
  }

  apply({ tab }: ToggleSlideOutTabInput): AsyncResult<void, Rejection> {
    if (this.#slideOut.isOpen && this.#slideOut.tab === tab) this.#slideOut.close()
    else this.#slideOut.open(tab)
    return AsyncResult.ok()
  }

  readonly #slideOut = inject(SlideOut)
}
