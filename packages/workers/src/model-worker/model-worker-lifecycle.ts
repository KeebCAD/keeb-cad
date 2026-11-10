import { type Committed, type CommitEvent, DesignStore } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { Dispatcher } from '@keeb-cad/messaging'
import {
  type FromModelWorker,
  type LayoutRow,
  type PackedLayoutOutput,
  type PackedPartsOutput,
  readLayoutRow,
  type ToModelWorker,
} from '@keeb-cad/protocol'
import { shallowRef } from '@keeb-cad/reactive'
import { InvariantError, Option } from '@keeb-cad/result'
import type { Workspace } from '@keeb-cad/schema'

import { findRow } from '../stage-snapshots/find-row'
import type { Posted } from '../stage-snapshots/types'
import type {
  ModelWorkerStatus,
  PostedIssues,
  Running,
  RunningStage,
  Spawn,
  SpawnedWorker,
} from './types'
import { DID_NOT_LOAD_TEXT, UNREADABLE_MESSAGE_TEXT } from './worker-failure-text'

export class ModelWorkerLifecycle {
  get status(): ModelWorkerStatus {
    return this.#status.value
  }

  // The whole list of the last post the gate accepted, with that post's seq.
  get issues(): Option<PostedIssues> {
    return Option.fromNullable(this.#issues.value)
  }

  get runningStage(): Option<RunningStage> {
    return Option.fromNullable(this.#runningStage.value)
  }

  get parts(): Option<Posted<PackedPartsOutput>> {
    return Option.fromNullable(this.#parts.value)
  }

  get layout(): Option<Posted<PackedLayoutOutput>> {
    return Option.fromNullable(this.#layout.value)
  }

  get layoutSetArrived(): boolean {
    const seq = this.#store.current.map((current) => current.seq).getOrUndefined()
    return seq !== undefined && this.#parts.value?.seq === seq && this.#layout.value?.seq === seq
  }

  layoutRow(id: string): Option<LayoutRow> {
    return this.layout.flatMap(({ output }) =>
      findRow(output.ids, id).map((row) => readLayoutRow(output, row)),
    )
  }

  start(spawn: Spawn, workspace: Workspace = 'layout'): void {
    if (this.#spawn !== undefined) throw new InvariantError('The model worker was started twice.')
    this.#spawn = spawn
    this.#workspace = workspace
    this.#store.events.on('commit', (event) => this.#commit(event))
    this.#spawnFromStore()
  }

  focus(workspace: Workspace): void {
    this.#workspace = workspace
    const running = this.#running
    if (running === undefined) return
    this.#dispatcher.send<ToModelWorker>(running.worker, {
      kind: 'focus',
      epoch: this.#epoch,
      seq: this.#committed().seq,
      workspace,
    })
  }

  restart(): void {
    if (this.#spawn === undefined) {
      throw new InvariantError('The model worker was restarted before it was started.')
    }
    this.#crashes = 0
    this.#spawnFromStore()
  }

  static readonly #crashCap = 3

  readonly #store = inject(DesignStore)
  readonly #status = shallowRef<ModelWorkerStatus>('idle')
  readonly #issues = shallowRef<PostedIssues | undefined>(undefined)
  readonly #runningStage = shallowRef<RunningStage | undefined>(undefined)
  readonly #parts = shallowRef<Posted<PackedPartsOutput> | undefined>(undefined)
  readonly #layout = shallowRef<Posted<PackedLayoutOutput> | undefined>(undefined)
  readonly #dispatcher = inject(Dispatcher)
  #spawn: Spawn | undefined
  #workspace: Workspace = 'layout'
  #epoch = 0
  #crashes = 0
  #running: Running | undefined

  #commit(event: CommitEvent): void {
    // A set posted before a whole commit belongs to another design, so it counts as no set.
    if (event.kind === 'whole') {
      this.#layout.value = undefined
      this.#parts.value = undefined
    }
    const running = this.#running
    if (running === undefined) {
      // The first Committed spawns the worker, which is sent that whole bundle; a failed worker
      // waits for restart(), which sends whatever is current then.
      if (this.#status.value === 'idle') this.#spawnFromStore()
      return
    }
    if (event.kind === 'whole') {
      this.#sendWhole(running.worker, event.committed)
      return
    }
    this.#dispatcher.send<ToModelWorker>(running.worker, {
      kind: 'patches',
      epoch: this.#epoch,
      seq: event.seq,
      patches: event.patches,
      revision: event.revision,
    })
  }

  #spawnFromStore(): void {
    const spawn = this.#spawn
    const current = this.#store.current
    if (spawn === undefined || current.isNone()) return
    this.#stop()
    this.#epoch += 1
    this.#dispatcher.restart(this.#epoch)
    this.#runningStage.value = undefined
    const worker = spawn()
    this.#running = { worker, stop: this.#watch(worker) }
    this.#status.value = 'running'
    this.#sendWhole(worker, current.value)
    this.#dispatcher.send<ToModelWorker>(worker, {
      kind: 'focus',
      epoch: this.#epoch,
      seq: current.value.seq,
      workspace: this.#workspace,
    })
  }

  #sendWhole(worker: SpawnedWorker, committed: Committed): void {
    const { design, routing, fingerprints, seq, revision } = committed
    this.#dispatcher.send<ToModelWorker>(worker, {
      kind: 'design',
      epoch: this.#epoch,
      seq,
      design,
      routing,
      fingerprints,
      revision,
    })
  }

  // Returns the call that stops watching the worker and terminates it.
  #watch(worker: SpawnedWorker): () => void {
    const stopListening = this.#dispatcher.listen<FromModelWorker>(worker, {
      issues: ({ seq, violations }) => {
        this.#crashes = 0
        this.#runningStage.value = undefined
        this.#issues.value = { seq, violations }
      },
      'layout-set': ({ seq, parts, layout }) => {
        this.#crashes = 0
        this.#runningStage.value = undefined
        this.#parts.value = { seq, output: parts }
        this.#layout.value = { seq, output: layout }
      },
      'stage-started': ({ stage }) => {
        this.#runningStage.value = { stage, arrivedAt: performance.now() }
      },
      'derived-files': ({ routing, fingerprints, seq }) => {
        this.#runningStage.value = undefined
        this.#store.acceptDerivedFiles({ routing, fingerprints }, seq)
      },
    })
    const onError = (event: Event) => {
      // Uncancelled, a worker's error is also reported as uncaught in main's global scope.
      event.preventDefault()
      this.#crash(ModelWorkerLifecycle.#errorMessage(event))
    }
    const onMessageError = () => this.#crash(UNREADABLE_MESSAGE_TEXT)
    worker.addEventListener('error', onError)
    worker.addEventListener('messageerror', onMessageError)
    return () => {
      stopListening()
      worker.removeEventListener('error', onError)
      worker.removeEventListener('messageerror', onMessageError)
      worker.terminate()
    }
  }

  // A throw in the worker delivers an ErrorEvent; a script that fails to load, a plain Event.
  static #errorMessage(event: Event): string {
    return event instanceof ErrorEvent && event.message !== '' ? event.message : DID_NOT_LOAD_TEXT
  }

  #crash(message: string): void {
    this.#crashes += 1
    if (this.#crashes < ModelWorkerLifecycle.#crashCap) {
      this.#spawnFromStore()
      return
    }
    const stage = this.#runningStage.value?.stage
    this.#stop()
    this.#runningStage.value = undefined
    this.#status.value = stage === undefined ? { message } : { message, stage }
  }

  #stop(): void {
    this.#running?.stop()
    this.#running = undefined
  }

  #committed(): Committed {
    const current = this.#store.current
    // A worker runs only once the store holds a design.
    if (current.isNone()) throw new InvariantError('The model worker ran with no design.')
    return current.value
  }
}
