import type { Action, Committed } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { AsyncResult, type Option } from '@keeb-cad/result'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'

import { emptyInputSchema } from '../empty-input-schema'
import type { EmptyInput } from '../types'

export class RestartModelWorker implements Action<EmptyInput, never> {
  static readonly kind = 'action'
  static readonly id = 'modelWorker.restartModelWorker'
  static readonly label = 'Restart'
  static readonly input = emptyInputSchema

  available(_current: Option<Committed>): boolean {
    return this.#lifecycle.status !== 'idle'
  }

  apply(_input: EmptyInput): AsyncResult<void, never> {
    this.#lifecycle.restart()
    return AsyncResult.ok()
  }

  readonly #lifecycle = inject(ModelWorkerLifecycle)
}
