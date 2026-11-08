import type { Workspace } from '@keeb-cad/schema'

import { ModelWorkerLifecycle } from '../model-worker/model-worker-lifecycle'

// Stands in for the lifecycle where no worker runs: records each workspace focus was called with,
// and sends nothing.
export class RecordingModelWorkerLifecycle extends ModelWorkerLifecycle {
  readonly focused: Workspace[] = []

  override focus(workspace: Workspace): void {
    this.focused.push(workspace)
  }
}
