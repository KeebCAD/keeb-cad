import { inject } from '@keeb-cad/di'
import { AsyncResult, attempt, InvariantError, Result } from '@keeb-cad/result'
import type { BlueprintDeclaration, LibraryData } from '@keeb-cad/schema'

import type { LaneFailure, LaneOutput, StageCalls } from '../lane/types'
import { closureKeyOf, keyOf } from '../pool/pin-key'
import type { PinnedBlueprint, PinnedScript } from '../pool/types'
import { VmPool } from '../pool/vm-pool'
import type { EngineUnavailable } from '../sandbox/types'
import { LaneCache } from './lane-cache'
import { laneCacheKey } from './lane-cache-key'
import { resolveClosure } from './resolve-closure'
import type { BlueprintPin, CachedLaneResult, LaneInputs, ResolvedPin, RunnerLane } from './types'

export class LaneRunner {
  /** True while a lane could become available by entering the pause again. */
  get hasUnavailable(): boolean {
    return this.#hasUnavailable
  }

  useLibrary(library: LibraryData): void {
    this.#library = library
  }

  /** Between applying patches and running stages: loads pinned scripts and fills the pool. */
  pause(pins: readonly BlueprintPin[]): AsyncResult<void, EngineUnavailable> {
    return attempt.in(this, async function* () {
      this.#hasUnavailable = false
      const pinnedVersions = new Map(pins.map(({ id, version }) => [id, version]))
      const loaded = new Map<string, PinnedBlueprint>()
      for (const pin of pins) {
        const resolved = resolveClosure(this.#libraryInUse().declarations, pin, pinnedVersions)
        // Retrying can't make a version appear in the app's own declarations.
        if (!resolved.isSome()) continue
        const pinned = await this.#load(resolved.value)
        if (pinned === undefined) this.#hasUnavailable = true
        else loaded.set(keyOf(pin.id, pin.version), pinned)
      }
      this.#pinned = loaded
      const paused = await this.#pool.pause([...loaded.values()])
      if (paused.isErr()) this.#hasUnavailable = true
      yield* paused
    })
  }

  runLane(
    lane: RunnerLane,
    calls: StageCalls,
    { canonical, laneArgs }: LaneInputs,
  ): Result<LaneOutput, LaneFailure> {
    const pinned = this.#pinned.get(keyOf(lane.id, lane.version))
    if (pinned === undefined) return Result.err({ kind: 'unavailable' })

    const key = laneCacheKey({ lane, closureKey: closureKeyOf(pinned), canonical })
    const cached = this.#cache.get(key)
    if (cached.isSome()) return this.#fromCache(cached.value)

    const result = this.#pool.runLane(lane, calls, laneArgs)
    result.match({
      ok: (ok) => {
        this.#cache.set(key, { ok })
      },
      err: (err) => {
        if (err.kind === 'lane-failed') this.#cache.set(key, { err })
        else if (err.kind === 'unavailable') this.#hasUnavailable = true
      },
    })
    return result
  }

  #fromCache(cached: CachedLaneResult): Result<LaneOutput, LaneFailure> {
    return 'ok' in cached ? Result.ok(cached.ok) : Result.err(cached.err)
  }

  #libraryInUse(): LibraryData {
    if (this.#library === undefined) {
      throw new InvariantError('The lane runner entered the pause before it was given a library.')
    }
    return this.#library
  }

  async #load({ root, closure }: ResolvedPin): Promise<PinnedBlueprint | undefined> {
    const own = await this.#scriptOf(root)
    if (own === undefined) return undefined
    const nested: PinnedScript[] = []
    for (const declaration of closure) {
      const script = await this.#scriptOf(declaration)
      if (script === undefined) return undefined
      nested.push({ declaration, script })
    }
    return { declaration: root, script: own, closure: nested }
  }

  async #scriptOf(declaration: BlueprintDeclaration): Promise<string | undefined> {
    const key = keyOf(declaration.id, declaration.version)
    const kept = this.#scripts.get(key)
    if (kept !== undefined) return kept
    const loaded = await this.#libraryInUse().loadScript(declaration.id, declaration.version)
    if (loaded.isErr()) return
    this.#scripts.set(key, loaded.value)
    return loaded.value
  }

  readonly #pool = inject(VmPool)
  readonly #cache = inject(LaneCache)
  readonly #scripts = new Map<string, string>()
  #pinned = new Map<string, PinnedBlueprint>()
  #library: LibraryData | undefined
  #hasUnavailable = false
}
