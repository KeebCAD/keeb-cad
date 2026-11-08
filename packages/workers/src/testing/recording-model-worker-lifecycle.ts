import type { Workspace } from '@keeb-cad/schema'

import { ModelWorkerLifecycle } from '../model-worker/model-worker-lifecycle'
import type { ModelWorkerStatus } from '../model-worker/types'

// Stands in for the lifecycle where no worker runs: records each workspace focus was called with
// and each restart, reports the status the test sets, and sends nothing.
export class RecordingModelWorkerLifecycle extends ModelWorkerLifecycle {
  readonly focused: Workspace[] = []
  restarts = 0

  override get status(): ModelWorkerStatus {
    return this.#reportedStatus
  }

  setStatus(status: ModelWorkerStatus): void {
    this.#reportedStatus = status
  }

  override focus(workspace: Workspace): void {
    this.focused.push(workspace)
  }

  override restart(): void {
    this.restarts += 1
  }

  #reportedStatus: ModelWorkerStatus = 'idle'
}
