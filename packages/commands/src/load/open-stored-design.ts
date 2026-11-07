import type { Action, Committed } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import type { AsyncResult, Option } from '@keeb-cad/result'

import { LoadFlow } from './load-flow'
import { openStoredDesignInputSchema } from './open-stored-design-input-schema'
import type { LoadFlowError, OpenStoredDesignInput } from './types'

export class OpenStoredDesign implements Action<OpenStoredDesignInput, LoadFlowError> {
  static readonly kind = 'action'
  static readonly id = 'load.openStoredDesign'
  static readonly label = 'Open stored design'
  static readonly input = openStoredDesignInputSchema

  available(_current: Option<Committed>): boolean {
    return true
  }

  apply({ id }: OpenStoredDesignInput): AsyncResult<void, LoadFlowError> {
    return this.#flow.load(id).map(() => {})
  }

  readonly #flow = inject(LoadFlow)
}
