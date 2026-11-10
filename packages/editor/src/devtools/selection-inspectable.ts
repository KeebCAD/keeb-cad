import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { subtreeIds } from '@keeb-cad/model/main'
import { idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import { Selection } from '../selection/selection'
import { editableField } from './inspectable-field'
import { devtoolsPluginId } from './plugin-id'
import type { Inspectable } from './types'

export class SelectionInspectable implements Inspectable {
  readonly id = `${devtoolsPluginId}.selection`
  readonly label = 'Selection'
  readonly fields = {
    // A selection names only nodes the design holds, so an edit keeps only those.
    ids: editableField({
      schema: v.array(idSchema),
      get: () => this.#selection.ids,
      set: (ids) => {
        const held = new Set<string>(
          this.#store.current.map(({ design }) => subtreeIds(design.layout)).getOr([]),
        )
        this.#selection.select(ids.filter((id) => held.has(id)))
      },
    }),
  }

  readonly #selection = inject(Selection)
  readonly #store = inject(DesignStore)
}
