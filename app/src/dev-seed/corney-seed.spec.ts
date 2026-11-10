import { DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import {
  aDesign,
  aFingerprintsFile,
  aMeta,
  anId,
  aRevision,
  aRoutingFile,
} from '@keeb-cad/schema/testing'
import { DesignStorage, writeBundle } from '@keeb-cad/storage'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'

import { Launch } from '../launch/launch'
import { mainModules } from '../main-modules'
import { devSeedModule } from './dev-seed-module'

const stored = aDesign({ meta: aMeta({ id: anId('stored'), name: 'Stored' }) })

function requestCorney(): void {
  const before = location.href
  const url = new URL(before)
  url.searchParams.set('seed', 'corney')
  // replaceState fires no popstate, which Firefox would deliver after the router listens.
  history.replaceState(null, '', `${url.pathname}${url.search}`)
  onTestFinished(() => {
    history.replaceState(null, '', before)
  })
}

async function arrange() {
  requestCorney()
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container.addModule(devSeedModule)
  container.override(storageBackend).useValue(new MemoryBackend())
  await container.autoLoad()
  const texts = writeBundle({
    design: stored,
    routing: aRoutingFile(),
    fingerprints: aFingerprintsFile(),
  })
  const label = { id: stored.meta.id, name: stored.meta.name, revision: aRevision('stored') }
  expectOk(await container.resolve(DesignStorage).save(label, texts, 'autosave'))
  const root = document.createElement('div')
  root.id = `seed-${crypto.randomUUID()}`
  document.body.append(root)
  onTestFinished(() => {
    ;(root as HTMLElement & { __vue_app__?: { unmount(): void } }).__vue_app__?.unmount()
    root.remove()
  })
  const workers: FakeWorker[] = []
  const spawn = () => {
    const worker = new FakeWorker()
    workers.push(worker)
    return worker
  }
  return {
    store: container.resolve(DesignStore),
    workers,
    launch: () => container.resolve(Launch).run(`#${root.id}`, spawn),
  }
}

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('the Corney seed', () => {
  it("opens a new design built by Corney's script, names it in the URL and sends it to the worker", async () => {
    const { store, workers, launch } = await arrange()

    await launch()

    const current = store.current.getOrUndefined()
    const id = current?.design.meta.id
    expect({
      id,
      layout: current?.design.layout.children,
      hash: location.hash,
      first: workers[0]?.received[0],
    }).toEqual({
      id: expect.not.stringMatching(/^stored$/),
      layout: [
        expect.objectContaining({
          id: 'outer',
          arrangement: 'chain',
          axis: 'y',
          children: [
            expect.objectContaining({ id: 'outer-bottom' }),
            expect.objectContaining({ id: 'outer-home' }),
            expect.objectContaining({ id: 'outer-top' }),
          ],
        }),
      ],
      hash: `#/design/${id}/layout`,
      first: expect.objectContaining({ kind: 'design', design: current?.design }),
    })
  })
})
