import { deepFreeze, DesignMirror, DesignMirrorWriter } from '@keeb-cad/design/worker'
import { inject } from '@keeb-cad/di'
import { Dispatcher, type Endpoint } from '@keeb-cad/messaging'
import {
  buffersOf,
  type FromModelWorker,
  packLayoutOutput,
  packPartsOutput,
  type ToModelWorker,
} from '@keeb-cad/protocol'
import { shallowRef } from '@keeb-cad/reactive'
import { InvariantError } from '@keeb-cad/result'
import type { FingerprintsFile, Frozen, RoutingFile, Workspace } from '@keeb-cad/schema'

import { BlueprintPause } from '../pause/blueprint-pause'
import type {
  DesignMessage,
  LatestDesignMessage,
  PatchesMessage,
  PipelineDerivations,
} from './types'

export class Pipeline {
  // Returns the call that stops listening.
  listen(endpoint: Endpoint, derivations: PipelineDerivations): () => void {
    this.#derivations = derivations
    return this.#dispatcher.listen<ToModelWorker>(endpoint, {
      design: (message) => {
        this.#receiveDesign(endpoint, message)
      },
      patches: (message) => {
        this.#receivePatches(endpoint, message)
      },
      focus: (message) => {
        this.#workspace.value = message.workspace
      },
    })
  }

  readonly #writer = inject(DesignMirrorWriter)
  readonly #mirror = inject(DesignMirror)
  readonly #dispatcher = inject(Dispatcher)
  readonly #pause = inject(BlueprintPause)
  #derivations: PipelineDerivations | undefined
  #latest: LatestDesignMessage | undefined
  readonly #routing = shallowRef<Frozen<RoutingFile> | undefined>(undefined)
  readonly #fingerprints = shallowRef<Frozen<FingerprintsFile> | undefined>(undefined)
  readonly #workspace = shallowRef<Workspace | undefined>(undefined)

  #receiveDesign(endpoint: Endpoint, message: DesignMessage): void {
    this.#writer.replace(message.design, message.revision)
    this.#routing.value = deepFreeze(message.routing)
    this.#fingerprints.value = deepFreeze(message.fingerprints)
    this.#enterPause(endpoint, message)
  }

  #receivePatches(endpoint: Endpoint, message: PatchesMessage): void {
    this.#writer.apply(message.patches, message.revision)
    this.#enterPause(endpoint, message)
  }

  #enterPause(endpoint: Endpoint, { epoch, seq }: ToModelWorker): void {
    this.#latest = { endpoint, epoch, seq }
    this.#pause.enter(
      () => this.#listening().pins.value,
      () => {
        this.#runStages()
      },
    )
  }

  #listening(): PipelineDerivations {
    if (this.#derivations === undefined) {
      throw new InvariantError('The pipeline ran before it was given its derivations.')
    }
    return this.#derivations
  }

  #runStages(): void {
    const latest = this.#latest
    const routing = this.#routing.value
    const fingerprints = this.#fingerprints.value
    // The gate drops everything before the first whole design, which sets all three.
    if (latest === undefined || routing === undefined || fingerprints === undefined) {
      throw new InvariantError('The model worker posted before its first whole design.')
    }
    const { endpoint, epoch, seq } = latest
    this.#dispatcher.send<FromModelWorker>(endpoint, {
      kind: 'stage-started',
      epoch,
      seq,
      stage: 'parts',
    })
    const { output, violations } = this.#listening().parts.value
    const parts = packPartsOutput(output)
    this.#dispatcher.send<FromModelWorker>(endpoint, {
      kind: 'stage-started',
      epoch,
      seq,
      stage: 'layout',
    })
    const layout = packLayoutOutput(this.#listening().placements.value)
    this.#dispatcher.send<FromModelWorker>(
      endpoint,
      { kind: 'layout-set', epoch, seq, parts, layout },
      [...buffersOf(parts), ...buffersOf(layout)],
    )
    this.#dispatcher.send<FromModelWorker>(endpoint, { kind: 'issues', epoch, seq, violations })
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
