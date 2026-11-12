import type { Action, Committed } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import type { AsyncResult, Option } from '@keeb-cad/result'

import { DesignLoader } from './design-loader'
import { openStoredDesignInputSchema } from './open-stored-design-input-schema'
import type { DesignLoaderError, OpenStoredDesignInput } from './types'

export class OpenStoredDesign implements Action<OpenStoredDesignInput, DesignLoaderError> {
  static readonly kind = 'action'
  static readonly id = 'load.openStoredDesign'
  static readonly label = 'Open stored design'
  static readonly input = openStoredDesignInputSchema

  available(_current: Option<Committed>): boolean {
    return true
  }

  apply({ id }: OpenStoredDesignInput): AsyncResult<void, DesignLoaderError> {
    return this.#loader.load(id).map(() => {})
  }

  readonly #loader = inject(DesignLoader)
}
