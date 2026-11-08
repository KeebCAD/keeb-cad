import { type Committed, DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'

import { readOnlyField } from './inspectable-field'
import { devtoolsPluginId } from './plugin-id'
import type { Inspectable } from './types'

export class DesignStoreInspectable implements Inspectable {
  readonly id = `${devtoolsPluginId}.design-store`
  readonly label = 'Design store'
  readonly fields = {
    seq: readOnlyField(() => this.#committed?.seq),
    revision: readOnlyField(() => this.#committed?.revision),
    design: readOnlyField(() => this.#committed?.design),
    routing: readOnlyField(() => this.#committed?.routing),
    fingerprints: readOnlyField(() => this.#committed?.fingerprints),
  }

  readonly #store = inject(DesignStore)

  get #committed(): Committed | undefined {
    return this.#store.current.getOrUndefined()
  }
}
