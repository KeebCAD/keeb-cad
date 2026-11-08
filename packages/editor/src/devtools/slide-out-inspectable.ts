import { inject } from '@keeb-cad/di'
import * as v from 'valibot'

import { SlideOut } from '../slide-out/slide-out'
import { editableField } from './inspectable-field'
import { devtoolsPluginId } from './plugin-id'
import type { Inspectable } from './types'

export class SlideOutInspectable implements Inspectable {
  readonly id = `${devtoolsPluginId}.slide-out`
  readonly label = 'Slide-out'
  readonly fields = {
    isOpen: editableField({
      schema: v.boolean(),
      get: () => this.#slideOut.isOpen,
      set: (open) => {
        if (open) this.#slideOut.open()
        else this.#slideOut.close()
      },
    }),
  }

  readonly #slideOut = inject(SlideOut)
}
