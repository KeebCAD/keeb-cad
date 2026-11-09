import { type Action, type Committed, DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { mintId } from '@keeb-cad/model/main'
import { AsyncResult, type Option } from '@keeb-cad/result'
import { designSchema, type DesignInvalid } from '@keeb-cad/schema'
import * as v from 'valibot'

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
    const design = v.parse(designSchema, {
      meta: {
        id: mintId(),
        name: 'Untitled design',
        form: { type: 'split', board: 'reversible' },
        defaultPart: 'key',
      },
      libraryVersions: [{ id: 'lib:blueprint/choc-key', version: 1 }],
      parts: [{ type: 'blueprint', id: 'key', blueprint: 'lib:blueprint/choc-key', inputs: {} }],
      layout: { id: mintId(), arrangement: 'free', children: [] },
    })
    return AsyncResult.fromResult(
      this.#store.replaceDesign({ design, unreadable: [] }).map(() => {}),
    )
  }

  readonly #store = inject(DesignStore)
}
