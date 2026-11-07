import { LoadFlow, NewDesign } from '@keeb-cad/commands'
import { type Committed, DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { Option } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { aFingerprintsFile, aRevision, aRoutingFile } from '@keeb-cad/schema/testing'
import { DesignStorage, writeBundle } from '@keeb-cad/storage'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { describe, expect, it } from 'vitest'

import { mainModules } from '../main-modules'
import { Autosave } from './autosave'

async function arrange(backend = new MemoryBackend()) {
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container.override(storageBackend).useValue(backend)
  await container.autoLoad()
  return {
    store: container.resolve(DesignStore),
    storage: container.resolve(DesignStorage),
    autosave: container.resolve(Autosave),
    lifecycle: container.resolve(ModelWorkerLifecycle),
    flow: container.resolve(LoadFlow),
  }
}

function committed(store: DesignStore): Committed {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value
}

// Each kept version's revision and reason, newest first, with the newest's texts.
async function saved(storage: DesignStorage, store: DesignStore) {
  const id = committed(store).design.meta.id
  const versions = await storage.listVersions(id)
  const loaded = await storage.load(id)
  return {
    versions: versions.map((list) => list.map(({ revision, reason }) => ({ revision, reason }))),
    newest: loaded.map(({ asRead }) => asRead),
  }
}

describe('Autosave', () => {
  it('saves a new design while the model worker is stopped', async () => {
    const { store, storage, lifecycle } = await arrange()

    expectOk(await store.run(NewDesign, {}))

    const { revision } = committed(store)
    await expect
      .poll(() => saved(storage, store))
      .toMatchObject({
        versions: { value: [{ revision, reason: 'autosave' }] },
        newest: { value: writeBundle(committed(store)) },
      })
    expect(lifecycle.status).toBe('idle')
  })

  it("saves accepted derived files with no edit after, replacing that revision's version", async () => {
    const { store, storage } = await arrange()
    expectOk(await store.run(NewDesign, {}))
    const { revision, seq } = committed(store)
    await expect
      .poll(async () => (await saved(storage, store)).versions)
      .toMatchObject({ value: [{ revision }] })

    store.acceptDerivedFiles(
      {
        routing: aRoutingFile({ revision: aRevision('accepted') }),
        fingerprints: aFingerprintsFile({ revision: aRevision('accepted') }),
      },
      seq,
    )

    await expect
      .poll(() => saved(storage, store))
      .toMatchObject({
        versions: { value: [{ revision, reason: 'autosave' }] },
        newest: { value: writeBundle(committed(store)) },
      })
  })

  it('holds no failure before a save fails', async () => {
    const { autosave } = await arrange()

    expect(autosave.failure).toEqual(Option.none())
  })

  it('holds quota-exceeded after a save refused for space, and clears it on the next success', async () => {
    const { store, autosave, flow } = await arrange(new MemoryBackend({ capacity: 1 }))
    expectOk(await store.run(NewDesign, {}))
    const first = committed(store).design.meta.id
    // A second design finds storage full and has no autosave of its own to drop.
    expectOk(await store.run(NewDesign, {}))
    await expect.poll(() => autosave.failure).toEqual(Option.some({ kind: 'quota-exceeded' }))

    // Reopening the first design saves at its revision, taking its own version's slot.
    expectOk(await flow.load(first))

    await expect.poll(() => autosave.failure).toEqual(Option.none())
  })
})
