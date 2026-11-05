import { type Action, type Committed, DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { mintId } from '@keeb-cad/model/main'
import { AsyncResult, type Option } from '@keeb-cad/result'
import type { Design, DesignInvalid } from '@keeb-cad/schema'

import { emptyInputSchema } from '../empty-input-schema'
import type { EmptyInput } from '../types'

export class NewDesign implements Action<EmptyInput, DesignInvalid> {
  static readonly kind = 'action'
  static readonly id = 'design.newDesign'
  static readonly label = 'New design'
  static readonly input = emptyInputSchema

  available(_current: Option<Committed>): boolean {
    return true
  }

  apply(_input: EmptyInput): AsyncResult<void, DesignInvalid> {
    // The free root group is the split form's center.
    const design: Design = {
      meta: {
        id: mintId(),
        name: 'Untitled design',
        form: { type: 'split', board: 'reversible' },
      },
      layout: { id: mintId(), arrangement: 'free', children: [] },
    }
    return AsyncResult.fromResult(
      this.#store.replaceDesign({ design, unreadable: [] }).map(() => {}),
    )
  }

  readonly #store = inject(DesignStore)
}
