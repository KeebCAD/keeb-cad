import { AsyncResult, Option, Result } from '@keeb-cad/result'
import type { Id } from '@keeb-cad/schema'

import type {
  CaughtError,
  StorageBackend,
  StoredDesign,
  StoredVersion,
  VersionId,
  NamedVersionSummary,
} from '../backend/types'
import type { BundleTexts } from '../bundle/types'
import type { MemoryBackendOptions } from './types'

// The storage backend in memory. Each operation settles on a later microtask, as a browser
// transaction does, so two callers can interleave.
export class MemoryBackend implements StorageBackend {
  constructor({ capacity = Infinity }: MemoryBackendOptions = {}) {
    this.#capacity = capacity
  }

  write(
    version: StoredVersion,
    replaces: readonly VersionId[],
  ): AsyncResult<VersionId, CaughtError> {
    return this.#later(() => {
      const kept = [...this.#versions.keys()].filter((id) => !replaces.includes(id))
      if (kept.length + 1 > this.#capacity) {
        return Result.err({
          name: 'QuotaExceededError',
          message: `The memory backend holds at most ${this.#capacity} versions.`,
        })
      }
      this.#counter += 1
      const id = this.#counter
      for (const replaced of replaces) this.#versions.delete(replaced)
      this.#versions.set(id, structuredClone(version))
      const { designId, name, revision, savedAt } = version
      this.#designs.set(designId, { id: designId, name, revision, lastVersion: id, savedAt })
      return Result.ok(id)
    })
  }

  versions(designId: Id): AsyncResult<NamedVersionSummary[], CaughtError> {
    return this.#later(() =>
      Result.ok(
        [...this.#versions]
          .filter(([, version]) => version.designId === designId)
          .map(([id, { name, revision, reason, savedAt }]) => ({
            version: id,
            name,
            revision,
            reason,
            savedAt,
          })),
      ),
    )
  }

  designs(): AsyncResult<StoredDesign[], CaughtError> {
    return this.#later(() =>
      Result.ok([...this.#designs.values()].map((design) => ({ ...design }))),
    )
  }

  read(version: VersionId): AsyncResult<Option<BundleTexts>, CaughtError> {
    return this.#later(() =>
      Result.ok(
        Option.fromNullable(this.#versions.get(version)).map(({ texts }) => structuredClone(texts)),
      ),
    )
  }

  delete(versions: readonly VersionId[]): AsyncResult<void, CaughtError> {
    return this.#later(() => {
      for (const id of versions) this.#versions.delete(id)
      return Result.ok()
    })
  }

  readonly #capacity: number
  readonly #versions = new Map<VersionId, StoredVersion>()
  readonly #designs = new Map<Id, StoredDesign>()
  #counter = 0

  #later<T>(operation: () => Result<T, CaughtError>): AsyncResult<T, CaughtError> {
    return AsyncResult.ok().flatMap(operation)
  }
}
