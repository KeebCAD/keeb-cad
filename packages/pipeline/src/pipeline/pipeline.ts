import { deepFreeze, DesignMirror, DesignMirrorWriter } from '@keeb-cad/design/worker'
import { inject } from '@keeb-cad/di'
import { Dispatcher, type Endpoint } from '@keeb-cad/messaging'
import type { FromModelWorker, ToModelWorker } from '@keeb-cad/protocol'
import { shallowRef } from '@keeb-cad/reactive'
import { InvariantError } from '@keeb-cad/result'
import type { FingerprintsFile, Frozen, RoutingFile, Workspace } from '@keeb-cad/schema'

import type { DesignMessage, PatchesMessage } from './types'

export class Pipeline {
  // Returns the call that stops listening.
  listen(endpoint: Endpoint): () => void {
    return this.#dispatcher.listen<ToModelWorker>(endpoint, {
      design: (message) => this.#receiveDesign(endpoint, message),
      patches: (message) => this.#receivePatches(endpoint, message),
      focus: (message) => {
        this.#workspace.value = message.workspace
      },
    })
  }

  readonly #writer = inject(DesignMirrorWriter)
  readonly #mirror = inject(DesignMirror)
  readonly #dispatcher = inject(Dispatcher)
  readonly #routing = shallowRef<Frozen<RoutingFile> | undefined>(undefined)
  readonly #fingerprints = shallowRef<Frozen<FingerprintsFile> | undefined>(undefined)
  readonly #workspace = shallowRef<Workspace | undefined>(undefined)

  #receiveDesign(endpoint: Endpoint, message: DesignMessage): void {
    this.#writer.replace(message.design, message.revision)
    this.#routing.value = deepFreeze(message.routing)
    this.#fingerprints.value = deepFreeze(message.fingerprints)
    this.#post(endpoint, message)
  }

  #receivePatches(endpoint: Endpoint, message: PatchesMessage): void {
    this.#writer.apply(message.patches, message.revision)
    this.#post(endpoint, message)
  }

  #post(endpoint: Endpoint, { epoch, seq }: ToModelWorker): void {
    const routing = this.#routing.value
    const fingerprints = this.#fingerprints.value
    // The gate drops everything before the first whole design, which sets both files.
    if (routing === undefined || fingerprints === undefined) {
      throw new InvariantError('The model worker posted before its first whole design.')
    }
    this.#dispatcher.send<FromModelWorker>(endpoint, { kind: 'issues', epoch, seq, violations: [] })
    this.#dispatcher.send<FromModelWorker>(endpoint, {
      kind: 'derived-files',
      epoch,
      seq,
      routing,
      fingerprints,
      revision: this.#mirror.revision,
    })
  }
}
