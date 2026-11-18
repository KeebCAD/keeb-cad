import { inject } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'

import type { UiAction } from '../ui-actions/types'
import { showSlideOutTabInputSchema } from './show-slide-out-tab-input-schema'
import { SlideOut } from './slide-out'
import type { ShowSlideOutTabInput } from './types'

export class ShowSlideOutTab implements UiAction<ShowSlideOutTabInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'slideOut.showSlideOutTab'
  static readonly label = 'Show slide-out tab'
  static readonly input = showSlideOutTabInputSchema

  available(): boolean {
    return true
  }

  apply({ tab }: ShowSlideOutTabInput): AsyncResult<void, Rejection> {
    this.#slideOut.open(tab)
    return AsyncResult.ok()
  }

  readonly #slideOut = inject(SlideOut)
}
