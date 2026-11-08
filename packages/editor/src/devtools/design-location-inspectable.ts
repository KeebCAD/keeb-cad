import { inject } from '@keeb-cad/di'

import { DesignLocation } from '../router/design-location'
import { readOnlyField } from './inspectable-field'
import { devtoolsPluginId } from './plugin-id'
import type { Inspectable } from './types'

export class DesignLocationInspectable implements Inspectable {
  readonly id = `${devtoolsPluginId}.design-location`
  readonly label = 'Design location'
  readonly fields = {
    workspace: readOnlyField(() => this.#location.workspace.getOrUndefined()),
  }

  readonly #location = inject(DesignLocation)
}
