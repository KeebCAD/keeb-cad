import { DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { holdsPlacement } from '@keeb-cad/model/main'
import { placementIdSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import { Selection } from '../selection/selection'
import { editableField } from './inspectable-field'
import { devtoolsPluginId } from './plugin-id'
import type { Inspectable } from './types'

export class SelectionInspectable implements Inspectable {
  readonly id = `${devtoolsPluginId}.selection`
  readonly label = 'Selection'
  readonly fields = {
    // A selection names only placements the design holds, so an edit keeps only those.
    ids: editableField({
      schema: v.array(placementIdSchema),
      get: () => this.#selection.ids,
      set: (ids) => {
        const design = this.#store.current.map(({ design }) => design).getOrUndefined()
        this.#selection.select(
          ids.filter((id) => design !== undefined && holdsPlacement(design, id)),
        )
      },
    }),
  }

  readonly #selection = inject(Selection)
  readonly #store = inject(DesignStore)
}
