import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import {
  aDesign,
  aFingerprintsFile,
  aMeta,
  anId,
  aRevision,
  aRoutingFile,
} from '@keeb-cad/schema/testing'
import { type BundleTexts, DesignStorage, storageModule, writeBundle } from '@keeb-cad/storage'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { describe, expect, it } from 'vitest'

import { LoadFlow } from './load-flow'
import { loadModule } from './load-module'

// Once failing, fails every write as a request on open browser storage does.
class FailingWrites extends MemoryBackend {
  failing = false

  override write(...arguments_: Parameters<MemoryBackend['write']>) {
    return this.failing
      ? AsyncResult.err({ name: 'UnknownError', message: 'The write failed.' })
      : super.write(...arguments_)
  }
}

// Hands the flow the stored bundle read without its routing file, as a file opened without one
// is; storage itself always holds all three.
class LoadsWithoutRouting extends DesignStorage {
  override load(...arguments_: Parameters<DesignStorage['load']>) {
    return super
      .load(...arguments_)
      .map((loaded) => ({ ...loaded, migrated: { ...loaded.migrated, routing: undefined } }))
  }
}

const label = { id: anId('corne'), name: 'Corne', revision: aRevision('stored') }

function storedTexts(): BundleTexts {
  return writeBundle({
    design: aDesign(),
    routing: aRoutingFile(),
    fingerprints: aFingerprintsFile(),
  })
}

const unreadableRouting = 'revision "r1" {'
const invalidRouting = 'revision 3\n'

interface Arrangement {
  stored: BundleTexts
  reason?: 'autosave' | 'reset'
  backend?: MemoryBackend
  storage?: typeof DesignStorage
}

async function arrange({
  stored,
  reason = 'autosave',
  backend = new MemoryBackend(),
  storage: storageClass = DesignStorage,
}: Arrangement) {
  const container = new Container()
    .addModule(designModule)
    .addModule(storageModule)
    .addModule(loadModule)
  container.override(storageBackend).useValue(backend)
  container.override(DesignStorage).useClass(storageClass)
  await container.autoLoad()
  const storage = container.resolve(DesignStorage)
  expectOk(await storage.save(label, stored, reason))
  const store = container.resolve(DesignStore)
  // A design already open, which a failed load leaves open.
  expectOk(
    store.replaceDesign({ design: aDesign({ meta: aMeta({ name: 'Open' }) }), unreadable: [] }),
  )
  return { flow: container.resolve(LoadFlow), store, storage, backend }
}

async function versionsOf(storage: DesignStorage) {
  const versions = await storage.listVersions(anId('corne'))
  expectOk(versions)
  return versions.value
}

describe('LoadFlow', () => {
  it('replaces the open design with a stored bundle, emptying nothing and keeping no reset version', async () => {
    const { flow, store, storage } = await arrange({ stored: storedTexts() })
    const before = await versionsOf(storage)

    const loaded = await flow.load(anId('corne'))

    expectOk(loaded)
    expect(loaded.value).toEqual({ emptied: [] })
    expect(store.current.getOrUndefined()?.design).toEqual(aDesign())
    expect(await versionsOf(storage)).toEqual(before)
  })

  it.each([
    ['unreadable', unreadableRouting],
    ['invalid', invalidRouting],
  ])(
    'keeps a reset version holding the bundle as read before loading routing that is %s',
    async (reason, routing) => {
      const stored = { ...storedTexts(), routing }
      const { flow, store, storage } = await arrange({ stored })

      const loaded = await flow.load(anId('corne'))

      expectOk(loaded)
      expect(loaded.value).toEqual({ emptied: [{ file: 'routing', reason }] })
      expect(store.current.getOrUndefined()?.design).toEqual(aDesign())
      expect(await versionsOf(storage)).toEqual([
        {
          version: expect.any(Number),
          revision: 'stored',
          reason: 'reset',
          savedAt: expect.any(Number),
        },
        {
          version: expect.any(Number),
          revision: 'stored',
          reason: 'autosave',
          savedAt: expect.any(Number),
        },
      ])
      const newest = await storage.load(anId('corne'))
      expectOk(newest)
      expect(newest.value.asRead).toEqual(stored)
    },
  )

  it('keeps no reset version before loading a bundle without routing', async () => {
    const { flow, storage } = await arrange({ stored: storedTexts(), storage: LoadsWithoutRouting })
    const before = await versionsOf(storage)

    const loaded = await flow.load(anId('corne'))

    expectOk(loaded)
    expect(loaded.value).toEqual({ emptied: [{ file: 'routing', reason: 'missing' }] })
    expect(await versionsOf(storage)).toEqual(before)
  })

  it('returns DesignInvalid for a design that fails its schema, keeping no reset version', async () => {
    // The writer takes only a valid Id, so the id is made invalid in the written text: an id must
    // be kebab-case.
    const invalidDesign = storedTexts().design.replace('meta id=corne', 'meta id=Corne')
    const { flow, store, storage } = await arrange({
      stored: { ...storedTexts(), design: invalidDesign, routing: unreadableRouting },
    })
    const open = store.current.getOrUndefined()
    const before = await versionsOf(storage)

    const loaded = await flow.load(anId('corne'))

    expectErr(loaded)
    expect(loaded.error).toMatchObject({ kind: 'design-invalid' })
    expect(store.current.getOrUndefined()).toBe(open)
    expect(await versionsOf(storage)).toEqual(before)
  })

  it('stops before replaceDesign with quota-exceeded when the reset save is refused with no autosave left', async () => {
    const stored = { ...storedTexts(), routing: unreadableRouting }
    const { flow, store, storage } = await arrange({
      stored,
      reason: 'reset',
      backend: new MemoryBackend({ capacity: 1 }),
    })
    const open = store.current.getOrUndefined()
    const before = await versionsOf(storage)

    const loaded = await flow.load(anId('corne'))

    expectErr(loaded)
    expect(loaded.error).toEqual({ kind: 'quota-exceeded' })
    expect(store.current.getOrUndefined()).toBe(open)
    expect(await versionsOf(storage)).toEqual(before)
  })

  it('stops before replaceDesign with storage-unavailable when the reset save request fails', async () => {
    const backend = new FailingWrites()
    const { flow, store, storage } = await arrange({
      stored: { ...storedTexts(), routing: unreadableRouting },
      backend,
    })
    const open = store.current.getOrUndefined()
    const before = await versionsOf(storage)
    backend.failing = true

    const loaded = await flow.load(anId('corne'))

    expectErr(loaded)
    expect(loaded.error).toEqual({
      kind: 'storage-unavailable',
      message: 'UnknownError: The write failed.',
    })
    expect(store.current.getOrUndefined()).toBe(open)
    expect(await versionsOf(storage)).toEqual(before)
  })
})
