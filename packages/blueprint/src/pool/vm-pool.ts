import { inject } from '@keeb-cad/di'
import { AsyncResult, attempt, Option, Result } from '@keeb-cad/result'

import { BLUEPRINT_API_VERSION } from '../api-version'
import type { BuildLaneArgs, LaneFailure, LaneOutput, StageCalls } from '../lane/types'
import { EngineLoader } from '../sandbox/engine-loader'
import type { EngineUnavailable } from '../sandbox/types'
import { BlueprintVm } from './blueprint-vm'
import { closureKeyOf, keyOf } from './pin-key'
import type { LaneRef, PinnedBlueprint, PoolEntry } from './types'
import { vmHasOutgrown } from './vm-has-outgrown'

export class VmPool {
  /** Between applying patches and running stages: creates, replaces and disposes VMs. */
  pause(pins: readonly PinnedBlueprint[]): AsyncResult<void, EngineUnavailable> {
    return attempt.in(this, async function* () {
      const wanted = new Map(
        pins.map((pin) => [keyOf(pin.declaration.id, pin.declaration.version), pin]),
      )
      for (const [key, entry] of this.#entries) {
        const pin = wanted.get(key)
        if (pin === undefined || this.#needsReplacing(entry, pin)) {
          entry.vm.dispose()
          this.#entries.delete(key)
        }
      }
      for (const [key, pinned] of wanted) {
        if (this.#entries.has(key)) continue
        const module = yield* await this.#loader.load()
        const vm = yield* await BlueprintVm.create(module, pinned)
        this.#entries.set(key, { vm, closureKey: closureKeyOf(pinned), pinned })
      }
    })
  }

  runLane(lane: LaneRef, calls: StageCalls, args: BuildLaneArgs): Result<LaneOutput, LaneFailure> {
    const entry = this.#entries.get(keyOf(lane.id, lane.version))
    if (entry === undefined) return Result.err({ kind: 'unavailable' })
    const tooNew = [entry.pinned, ...entry.pinned.closure].find(
      ({ declaration }) => declaration.apiVersion > BLUEPRINT_API_VERSION,
    )
    return tooNew === undefined
      ? entry.vm.runLane(lane.stage, calls, args)
      : Result.err({ kind: 'blueprint-api-too-new', blueprint: tooNew.declaration.id })
  }

  vmFor(id: string, version: number): Option<BlueprintVm> {
    const entry = this.#entries.get(keyOf(id, version))
    return entry === undefined ? Option.none() : Option.some(entry.vm)
  }

  [Symbol.dispose](): void {
    for (const entry of this.#entries.values()) entry.vm.dispose()
    this.#entries.clear()
  }

  #needsReplacing(entry: PoolEntry, pin: PinnedBlueprint): boolean {
    return (
      entry.vm.isDead ||
      vmHasOutgrown(entry.vm.linearMemoryBytes) ||
      entry.closureKey !== closureKeyOf(pin)
    )
  }

  readonly #loader = inject(EngineLoader)
  readonly #entries = new Map<string, PoolEntry>()
}
