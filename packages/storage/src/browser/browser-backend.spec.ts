import { Container } from '@keeb-cad/di'
import { aDesign, aFingerprintsFile, anId, aRevision, aRoutingFile } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'

import { storageBackend } from '../backend/storage-backend'
import { writeBundle } from '../bundle/write-bundle'
import { DesignStorage } from '../design-storage/design-storage'
import { storageModule } from '../storage-module'
import { backendContract } from '../testing'
import { BrowserStorageAccess } from './browser-storage-access'
import { StorageDatabase } from './storage-database'

const insecure = 'The operation is insecure.'

// A database of its own per test, deleted after it, so a shuffled run shares none.
function arrange(factory: IDBFactory = indexedDB) {
  const container = new Container().addModule(storageModule)
  container
    .override(BrowserStorageAccess)
    .useValue({ factory, keyRange: IDBKeyRange, name: `storage-${crypto.randomUUID()}` })
  const database = container.resolve(StorageDatabase)
  onTestFinished(async () => {
    await database.delete({ disableAutoOpen: false })
  })
  return container
}

// The error a call returned, or a plain ok.
const failure = { ok: () => ({ kind: 'ok' }) as const, err: <E>(error: E) => error }

// Opening throws, as it does on an opaque origin.
function insecureFactory(): IDBFactory {
  return {
    open: () => {
      throw new DOMException(insecure, 'SecurityError')
    },
    deleteDatabase: (name) => indexedDB.deleteDatabase(name),
    cmp: (first, second) => indexedDB.cmp(first, second),
    databases: () => indexedDB.databases(),
  }
}

describe('BrowserBackend', () => {
  backendContract(() => arrange().resolve(storageBackend))

  it.each([
    ['load', (storage: DesignStorage) => storage.load(anId('corne')).match(failure)],
    [
      'save',
      (storage: DesignStorage) =>
        storage
          .save(
            { id: anId('corne'), name: 'Corne', revision: aRevision() },
            writeBundle({
              design: aDesign(),
              routing: aRoutingFile(),
              fingerprints: aFingerprintsFile(),
            }),
            'autosave',
          )
          .match(failure),
    ],
    [
      'listVersions',
      (storage: DesignStorage) => storage.listVersions(anId('corne')).match(failure),
    ],
    ['listDesigns', (storage: DesignStorage) => storage.listDesigns().match(failure)],
  ])(
    "returns storage-unavailable from %s with the DOMException's name and text when browser storage can't be opened",
    async (_method, call) => {
      const storage = arrange(insecureFactory()).resolve(DesignStorage)

      const error = await call(storage)

      expect(error).toEqual({
        kind: 'storage-unavailable',
        message: `SecurityError: ${insecure}`,
      })
    },
  )
})
