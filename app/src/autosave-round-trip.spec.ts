import { NewDesign } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import {
  BrowserStorageAccess,
  DesignStorage,
  type DesignBundle,
  writeBundle,
} from '@keeb-cad/storage'
import { describe, expect, it, onTestFinished } from 'vitest'

import { mainModules } from './main-modules'

// The real container on browser storage, a database of its own per test, deleted after it.
async function arrange() {
  const name = `autosave-${crypto.randomUUID()}`
  onTestFinished(() => {
    indexedDB.deleteDatabase(name)
  })
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container
    .override(BrowserStorageAccess)
    .useValue({ factory: indexedDB, keyRange: IDBKeyRange, name })
  await container.autoLoad()
  return { store: container.resolve(DesignStore), storage: container.resolve(DesignStorage) }
}

function current(store: DesignStore): DesignBundle {
  const committed = store.current
  if (committed.isNone()) throw new Error('Expected a committed design.')
  return committed.value
}

describe('the autosave round trip', () => {
  it('reopens a new design from browser storage through load and replaceDesign, each file byte-identical', async () => {
    const { store, storage } = await arrange()
    expectOk(await store.run(NewDesign, {}))
    const written = writeBundle(current(store))
    const id = current(store).design.meta.id
    await expect.poll(async () => (await storage.load(id)).isOk()).toBe(true)

    const loaded = await storage.load(id)
    expectOk(loaded)
    const replaced = store.replaceDesign(loaded.value.migrated)

    expectOk(replaced)
    expect(loaded.value.asRead).toEqual(written)
    expect(writeBundle(current(store))).toEqual(written)
  })
})
