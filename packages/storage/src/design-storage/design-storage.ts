import { inject } from '@keeb-cad/di'
import { AsyncResult, attempt, Option, Result } from '@keeb-cad/result'
import type { Id, VersionReason } from '@keeb-cad/schema'

import { storageBackend } from '../backend/storage-backend'
import { toStorageError, toStorageUnavailable } from '../backend/to-storage-error'
import type { VersionSummary } from '../backend/types'
import { readBundle } from '../bundle/read-bundle'
import type { BundleTexts, LoadedBundle } from '../bundle/types'
import { latestSavedFirst, newestFirst } from '../order/order'
import { pruneCandidate, replacedBy } from '../retention/retention'
import type {
  DesignLabel,
  DesignSummary,
  LoadFailure,
  SaveError,
  StorageUnavailable,
} from './types'

export class DesignStorage {
  // One save at a time, in call order: each reads the versions its write replaces.
  save(
    label: DesignLabel,
    texts: BundleTexts,
    reason: VersionReason,
  ): AsyncResult<void, SaveError> {
    const previous = this.#saving
    const saved = attempt.in(this, async function* () {
      // A save that threw still lets the next one run.
      await Promise.allSettled([previous])
      yield* await this.#saveNow(label, texts, reason)
    })
    this.#saving = saved
    return saved
  }

  load(id: Id): AsyncResult<LoadedBundle, LoadFailure> {
    return attempt.in(this, async function* () {
      const versions = yield* this.#backend.versions(id).mapErr(toStorageUnavailable)
      const [newest] = newestFirst(versions)
      const notFound = { kind: 'not-found', id } as const
      const version = yield* Option.fromNullable(newest).okOr(notFound)
      const read = yield* this.#backend.read(version.version).mapErr(toStorageUnavailable)
      const asRead = yield* read.okOr(notFound)
      const migrated = yield* readBundle(asRead)
      const label = { id, name: version.name, revision: version.revision }
      return { migrated, asRead, label }
    })
  }

  listVersions(id: Id): AsyncResult<VersionSummary[], StorageUnavailable> {
    return this.#backend
      .versions(id)
      .map((versions) =>
        newestFirst(versions).map(({ version, revision, reason, savedAt }) => ({
          version,
          revision,
          reason,
          savedAt,
        })),
      )
      .mapErr(toStorageUnavailable)
  }

  listDesigns(): AsyncResult<DesignSummary[], StorageUnavailable> {
    return this.#backend
      .designs()
      .map((designs) =>
        latestSavedFirst(designs).map(({ id, name, revision, savedAt }) => ({
          id,
          name,
          revision,
          savedAt,
        })),
      )
      .mapErr(toStorageUnavailable)
  }

  readonly #backend = inject(storageBackend)
  #saving: PromiseLike<unknown> = Promise.resolve()

  // On a quota refusal it drops the design's oldest autosave and tries again, so quota-exceeded
  // means the design has no autosave left to drop but its newest version.
  async #saveNow(
    label: DesignLabel,
    texts: BundleTexts,
    reason: VersionReason,
  ): Promise<Result<void, SaveError>> {
    for (;;) {
      const versions = await this.#backend.versions(label.id)
      if (versions.isErr()) return Result.err(toStorageUnavailable(versions.error))
      const written = await this.#backend.write(
        {
          designId: label.id,
          name: label.name,
          revision: label.revision,
          reason,
          savedAt: Date.now(),
          texts,
        },
        replacedBy(versions.value, label.revision, reason),
      )
      if (written.isOk()) return Result.ok()
      const error = toStorageError(written.error)
      const candidate = pruneCandidate(versions.value)
      if (error.kind !== 'quota-exceeded' || candidate.isNone()) return Result.err(error)
      const pruned = await this.#backend.delete([candidate.value])
      if (pruned.isErr()) return Result.err(toStorageError(pruned.error))
    }
  }
}
