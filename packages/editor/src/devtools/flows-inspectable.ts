import { inject } from '@keeb-cad/di'

import { Flows } from '../flows/flows'
import { readOnlyField } from './inspectable-field'
import { devtoolsPluginId } from './plugin-id'
import type { Inspectable } from './types'

export class FlowsInspectable implements Inspectable {
  readonly id = `${devtoolsPluginId}.flows`
  readonly label = 'Flows'
  readonly fields = {
    // A draft changes only through Flows, so the stack is read-only here.
    stack: readOnlyField(() =>
      this.#flows.stack.map(({ entry, draft }) => ({
        entry: entry.id,
        flow: entry.handle.name,
        finishesWith: entry.handle.finishesWith.id,
        draft,
      })),
    ),
  }

  readonly #flows = inject(Flows)
}
