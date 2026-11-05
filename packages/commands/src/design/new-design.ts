import { type Action, type Committed, DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { mintId } from '@keeb-cad/model/main'
import { AsyncResult, InvariantError, type Option } from '@keeb-cad/result'
import type { Design } from '@keeb-cad/schema'

import { newDesignInputSchema } from './new-design-input-schema'
import type { NewDesignInput } from './types'

export class NewDesign implements Action<NewDesignInput, never> {
  static readonly kind = 'action'
  static readonly id = 'design.newDesign'
  static readonly label = 'New design'
  static readonly input = newDesignInputSchema

  available(_current: Option<Committed>): boolean {
    return true
  }

  apply(_input: NewDesignInput): AsyncResult<void, never> {
    // The free root group is the split form's center.
    const design: Design = {
      meta: {
        id: mintId(),
        name: 'Untitled design',
        form: { type: 'split', board: 'reversible' },
      },
      layout: { id: mintId(), arrangement: 'free', children: [] },
    }
    const replaced = this.#store.replaceDesign({ design, unreadable: [] })
    if (replaced.isErr()) {
      throw new InvariantError(
        `A new design failed its own schema: ${JSON.stringify(replaced.error)}`,
      )
    }
    return AsyncResult.ok()
  }

  readonly #store = inject(DesignStore)
}
