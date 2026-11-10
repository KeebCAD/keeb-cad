import { inject } from '@keeb-cad/di'
import * as v from 'valibot'

import { Viewport } from '../viewport/viewport'
import { editableField } from './inspectable-field'
import { devtoolsPluginId } from './plugin-id'
import type { Inspectable } from './types'

export class ViewportInspectable implements Inspectable {
  readonly id = `${devtoolsPluginId}.viewport`
  readonly label = 'Viewport'
  readonly fields = {
    centre: editableField({
      schema: v.strictObject({ x: v.number(), y: v.number() }),
      get: () => this.#viewport.centre,
      set: (centre) => {
        this.#viewport.setCentre(centre)
      },
    }),
    // A zero or negative zoom would empty or flip the canvas.
    zoom: editableField({
      schema: v.pipe(v.number(), v.gtValue(0)),
      get: () => this.#viewport.zoom,
      set: (zoom) => {
        this.#viewport.setZoom(zoom)
      },
    }),
  }

  readonly #viewport = inject(Viewport)
}
