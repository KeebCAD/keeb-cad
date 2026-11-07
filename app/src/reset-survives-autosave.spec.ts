import { LoadFlow } from '@keeb-cad/commands'
import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { Option } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aFingerprintsFile, aRoutingFile } from '@keeb-cad/schema/testing'
import { BrowserStorageAccess, DesignStorage, writeBundle } from '@keeb-cad/storage'
import { storageBackend } from '@keeb-cad/storage/testing'
import { describe, expect, it, onTestFinished } from 'vitest'

import { mainModules } from './main-modules'

// The revision the design store gives aDesign().
async function revisionOfADesign() {
  const container = new Container().addModule(designModule)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))
  return store.current.map(({ revision }) => revision).getOrUndefined()
}

async function arrange(routing: string) {
  const name = `reset-${crypto.randomUUID()}`
  onTestFinished(() => {
    indexedDB.deleteDatabase(name)
  })
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container
    .override(BrowserStorageAccess)
    .useValue({ factory: indexedDB, keyRange: IDBKeyRange, name })
  await container.autoLoad()
  const storage = container.resolve(DesignStorage)
  const revision = await revisionOfADesign()
  if (revision === undefined) throw new Error('Expected a revision.')
  const design = aDesign()
  const label = { id: design.meta.id, name: design.meta.name, revision }
  const stored = {
    ...writeBundle({ design, routing: aRoutingFile(), fingerprints: aFingerprintsFile() }),
    routing,
  }
  expectOk(await storage.save(label, stored, 'autosave'))
  return {
    flow: container.resolve(LoadFlow),
    storage,
    backend: container.resolve(storageBackend),
    stored,
    label,
  }
}

describe('a reset point beside autosave', () => {
  it.each([
    ['unreadable', 'revision "r1" {'],
    ['parses as KDL but fails its schema', 'revision 3\n'],
  ])(
    'keeps the bundle as read when its routing file is %s, and the autosave at that revision leaves it in place',
    async (_role, routing) => {
      const { flow, storage, backend, stored, label } = await arrange(routing)

      expectOk(await flow.load(label.id))

      await expect
        .poll(async () =>
          (await storage.listVersions(label.id)).map((versions) =>
            versions.map(({ reason }) => reason),
          ),
        )
        .toMatchObject({ value: ['autosave', 'reset'] })
      const versions = await storage.listVersions(label.id)
      expectOk(versions)
      expect(versions.value).toEqual([
        {
          version: expect.any(Number),
          revision: label.revision,
          reason: 'autosave',
          savedAt: expect.any(Number),
        },
        {
          version: expect.any(Number),
          revision: label.revision,
          reason: 'reset',
          savedAt: expect.any(Number),
        },
      ])
      const read = await Promise.all(versions.value.map(({ version }) => backend.read(version)))
      // The second, by the order asserted above, is the reset point.
      expect(read[1]).toMatchObject({ value: Option.some(stored) })
    },
  )
})
