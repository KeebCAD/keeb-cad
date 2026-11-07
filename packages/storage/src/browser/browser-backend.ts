import { inject } from '@keeb-cad/di'
import { AsyncResult, Option } from '@keeb-cad/result'
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
import { StorageDatabase } from './storage-database'

export class BrowserBackend implements StorageBackend {
  write(
    version: StoredVersion,
    replaces: readonly VersionId[],
  ): AsyncResult<VersionId, CaughtError> {
    const { versions, designs, meta } = this.#database
    return this.#run(() =>
      this.#database.transaction('rw', [versions, designs, meta], async () => {
        const counter = ((await meta.get('counter'))?.value ?? 0) + 1
        await meta.put({ key: 'counter', value: counter })
        await versions.add({ ...version, version: counter })
        const { designId, name, revision, savedAt } = version
        await designs.put({ id: designId, name, revision, lastVersion: counter, savedAt })
        await versions.bulkDelete([...replaces])
        return counter
      }),
    )
  }

  versions(designId: Id): AsyncResult<NamedVersionSummary[], CaughtError> {
    return this.#run(async () => {
      const rows = await this.#database.versions.where('designId').equals(designId).toArray()
      return rows.map(({ version, name, revision, reason, savedAt }) => ({
        version,
        name,
        revision,
        reason,
        savedAt,
      }))
    })
  }

  designs(): AsyncResult<StoredDesign[], CaughtError> {
    return this.#run(() => this.#database.designs.toArray())
  }

  read(version: VersionId): AsyncResult<Option<BundleTexts>, CaughtError> {
    return this.#run(async () =>
      Option.fromNullable(await this.#database.versions.get(version)).map(({ texts }) => texts),
    )
  }

  delete(versions: readonly VersionId[]): AsyncResult<void, CaughtError> {
    return this.#run(() => this.#database.versions.bulkDelete([...versions]))
  }

  readonly #database = inject(StorageDatabase)

  // Run inside an async function, so a synchronous throw from an opening request lands here too.
  #run<T>(operation: () => PromiseLike<T>): AsyncResult<T, CaughtError> {
    return AsyncResult.fromPromise((async () => await operation())(), (error) =>
      this.#caught(error),
    )
  }

  // Dexie wraps the DOMException that caused a failure as `inner`.
  #caught(error: unknown): CaughtError {
    const inner =
      typeof error === 'object' && error !== null && 'inner' in error ? error.inner : undefined
    return {
      ...this.#described(error),
      ...(inner === undefined || inner === null ? {} : { inner: this.#described(inner) }),
    }
  }

  #described(error: unknown): { name: string; message: string } {
    return error instanceof Error || error instanceof DOMException
      ? { name: error.name, message: error.message }
      : { name: 'Error', message: String(error) }
  }
}
