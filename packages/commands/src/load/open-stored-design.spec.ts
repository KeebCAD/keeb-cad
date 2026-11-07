import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
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

import { loadModule } from './load-module'
import { OpenStoredDesign } from './open-stored-design'

const corne = aDesign({ meta: aMeta({ id: anId('corne'), name: 'Corne' }) })
const lily = aDesign({ meta: aMeta({ id: anId('lily'), name: 'Lily' }) })

function textsOf(design = corne, routing?: string): BundleTexts {
  const texts = writeBundle({ design, routing: aRoutingFile(), fingerprints: aFingerprintsFile() })
  return routing === undefined ? texts : { ...texts, routing }
}

interface Stored {
  design: Design
  texts: BundleTexts
}

async function arrange(stored: Stored[], backend = new MemoryBackend()) {
  const container = new Container()
    .addModule(designModule)
    .addModule(storageModule)
    .addModule(loadModule)
  container.override(storageBackend).useValue(backend)
  await container.autoLoad()
  const storage = container.resolve(DesignStorage)
  for (const { design, texts } of stored) {
    const label = { id: design.meta.id, name: design.meta.name, revision: aRevision('stored') }
    expectOk(await storage.save(label, texts, 'autosave'))
  }
  return { store: container.resolve(DesignStore) }
}

describe('OpenStoredDesign', () => {
  it('opens a stored design that loads, the store then holding it', async () => {
    const { store } = await arrange([{ design: corne, texts: textsOf() }])

    const opened = await store.run(OpenStoredDesign, { id: anId('corne') })

    expectOk(opened)
    expect(store.current.getOrUndefined()).toMatchObject({ design: corne })
  })

  it('returns not-found naming an id storage does not hold', async () => {
    const { store } = await arrange([{ design: corne, texts: textsOf() }])

    const opened = await store.run(OpenStoredDesign, { id: anId('unknown') })

    expectErr(opened)
    expect(opened.error).toEqual({ kind: 'not-found', id: anId('unknown') })
  })

  it('returns quota-exceeded when the reset save is refused, the open design unchanged', async () => {
    // Two one-version designs fill a capacity of two, so the reset point has no room.
    const { store } = await arrange(
      [
        { design: corne, texts: textsOf(corne, 'revision "r1" {') },
        { design: lily, texts: textsOf(lily) },
      ],
      new MemoryBackend({ capacity: 2 }),
    )
    expectOk(await store.run(OpenStoredDesign, { id: anId('lily') }))
    const open = store.current.getOrUndefined()

    const opened = await store.run(OpenStoredDesign, { id: anId('corne') })

    expectErr(opened)
    expect(opened.error).toEqual({ kind: 'quota-exceeded' })
    expect(store.current.getOrUndefined()).toBe(open)
  })
})
