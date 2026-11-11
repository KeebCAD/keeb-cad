import { inject } from '@keeb-cad/di'

import { Viewport } from '../viewport/viewport'
import { viewportValueSchema } from '../viewport/viewport-value-schema'
import { editableField } from './inspectable-field'
import { devtoolsPluginId } from './plugin-id'
import type { Inspectable } from './types'

export class ViewportInspectable implements Inspectable {
  readonly id = `${devtoolsPluginId}.viewport`
  readonly label = 'Viewport'
  readonly fields = {
    centre: editableField({
      schema: viewportValueSchema.entries.centre,
      get: () => this.#viewport.centre,
      set: (centre) => {
        this.#viewport.setCentre(centre)
      },
    }),
    // A zoom outside the range is refused, as from storage.
    zoom: editableField({
      schema: viewportValueSchema.entries.zoom,
      get: () => this.#viewport.zoom,
      set: (zoom) => {
        this.#viewport.setZoom(zoom)
      },
    }),
  }

  readonly #viewport = inject(Viewport)
}
