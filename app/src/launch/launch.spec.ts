import { DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { Option, Result } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design, Id } from '@keeb-cad/schema'
import {
  aDesign,
  aFingerprintsFile,
  aMeta,
  anId,
  aRevision,
  aRoutingFile,
} from '@keeb-cad/schema/testing'
import {
  BrowserStorageAccess,
  type BundleTexts,
  DesignStorage,
  writeBundle,
} from '@keeb-cad/storage'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { FakeWorker } from '@keeb-cad/workers/testing'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Autosave } from '../autosave/autosave'
import { mainModules } from '../main-modules'
import { Launch } from './launch'

const insecure = 'The operation is insecure.'

const older = aDesign({ meta: aMeta({ id: anId('older'), name: 'Older' }) })
const newer = aDesign({ meta: aMeta({ id: anId('newer'), name: 'Newer' }) })

function textsOf(design: Design): BundleTexts {
  return writeBundle({ design, routing: aRoutingFile(), fingerprints: aFingerprintsFile() })
}

// Each fails to load in its own way: the schema refuses an id that isn't kebab-case.
const brokenDesignTexts = {
  'fails its schema': (texts: BundleTexts, id: Id) => ({
    ...texts,
    design: texts.design.replace(`meta id=${id}`, `meta id=${id.toUpperCase()}`),
  }),
  "isn't KDL": (texts: BundleTexts) => ({ ...texts, design: 'meta id="' }),
  'has a newer format-version': (texts: BundleTexts) => ({
    ...texts,
    design: texts.design.replace('format-version 1', 'format-version 2'),
  }),
}

function broken(design: Design, how: keyof typeof brokenDesignTexts = 'fails its schema') {
  return { design, texts: brokenDesignTexts[how](textsOf(design), design.meta.id) }
}

function intact(design: Design) {
  return { design, texts: textsOf(design) }
}

interface Stored {
  design: Design
  texts: BundleTexts
}

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

// A database of the test's own, deleted after it.
function aDatabase(): string {
  const name = `launch-${crypto.randomUUID()}`
  onTestFinished(() => {
    indexedDB.deleteDatabase(name)
  })
  return name
}

type StorageChoice = { backend: MemoryBackend } | { database: string; factory?: IDBFactory }

interface Arrangement {
  hash: string
  stored?: Stored[]
  storage?: StorageChoice
}

async function arrange({
  hash,
  stored = [],
  storage = { backend: new MemoryBackend() },
}: Arrangement) {
  // Firefox delivers the popstate of a `location.hash` write a task later, after the router
  // listens, and that late navigation would undo launch's own. replaceState fires none.
  history.replaceState(null, '', hash === '' ? location.pathname + location.search : hash)
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  if ('backend' in storage) {
    container.override(storageBackend).useValue(storage.backend)
  } else {
    const { database: name, factory = indexedDB } = storage
    container.override(BrowserStorageAccess).useValue({ factory, keyRange: IDBKeyRange, name })
  }
  await container.autoLoad()
  const designStorage = container.resolve(DesignStorage)
  for (const { design, texts } of stored) {
    const label = { id: design.meta.id, name: design.meta.name, revision: aRevision('stored') }
    expectOk(await designStorage.save(label, texts, 'autosave'))
  }
  const root = document.createElement('div')
  root.id = `launch-${crypto.randomUUID()}`
  document.body.append(root)
  const unmount = () => {
    ;(root as HTMLElement & { __vue_app__?: { unmount(): void } }).__vue_app__?.unmount()
    root.remove()
  }
  onTestFinished(unmount)
  const workers: FakeWorker[] = []
  const spawn = () => {
    const worker = new FakeWorker()
    workers.push(worker)
    return worker
  }
  return {
    store: container.resolve(DesignStore),
    storage: designStorage,
    backend: container.resolve(storageBackend),
    autosave: container.resolve(Autosave),
    storedIds: stored.map(({ design }) => design.meta.id),
    workers,
    unmount,
    launch: () => container.resolve(Launch).run(`#${root.id}`, spawn),
  }
}

type Arranged = Awaited<ReturnType<typeof arrange>>

function opened({ store }: Arranged) {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  const { id, name } = current.value.design.meta
  return { id, name }
}

// The read of each version kept for a design, newest first.
async function keptTexts({ storage, backend }: Arranged, id: Id) {
  const versions = await storage.listVersions(id)
  expectOk(versions)
  return Promise.all(versions.value.map(({ version }) => backend.read(version)))
}

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('Launch', () => {
  describe('with no id in the URL', () => {
    it('opens a new design on empty storage and puts it in the URL at layout', async () => {
      const arranged = await arrange({ hash: '' })

      await arranged.launch()

      expect(arranged.storedIds).not.toContain(opened(arranged).id)
      expect(location.hash).toBe(`#/design/${opened(arranged).id}/layout`)
    })

    it('opens the only stored design', async () => {
      const arranged = await arrange({ hash: '', stored: [intact(older)] })

      await arranged.launch()

      expect(opened(arranged)).toEqual({ id: anId('older'), name: 'Older' })
      expect(location.hash).toBe('#/design/older/layout')
    })

    it('opens the newer of two stored designs', async () => {
      const arranged = await arrange({ hash: '', stored: [intact(older), intact(newer)] })

      await arranged.launch()

      expect(opened(arranged)).toEqual({ id: anId('newer'), name: 'Newer' })
    })

    it('opens a new design when the newest is broken, never trying the older', async () => {
      const arranged = await arrange({ hash: '', stored: [intact(older), broken(newer)] })

      await arranged.launch()

      expect(arranged.storedIds).not.toContain(opened(arranged).id)
    })

    it.each([['fails its schema'], ["isn't KDL"], ['has a newer format-version']] as const)(
      'opens a new design when the only stored one %s, leaving it unchanged',
      async (how) => {
        const stored = broken(older, how)
        const arranged = await arrange({ hash: '', stored: [stored] })

        await arranged.launch()

        expect(arranged.storedIds).not.toContain(opened(arranged).id)
        expect(await keptTexts(arranged, anId('older'))).toEqual([
          Result.ok(Option.some(stored.texts)),
        ])
      },
    )
  })

  describe("with the URL's id", () => {
    it('opens the older of two when the URL names it, leaving the URL unchanged', async () => {
      const arranged = await arrange({
        hash: '#/design/older/layout',
        stored: [intact(older), intact(newer)],
      })

      await arranged.launch()

      expect(opened(arranged)).toEqual({ id: anId('older'), name: 'Older' })
      expect(location.hash).toBe('#/design/older/layout')
    })

    it('opens the newest for an id not stored, putting its id in the URL', async () => {
      const arranged = await arrange({
        hash: '#/design/unknown/layout',
        stored: [intact(older), intact(newer)],
      })

      await arranged.launch()

      expect(opened(arranged)).toEqual({ id: anId('newer'), name: 'Newer' })
      expect(location.hash).toBe('#/design/newer/layout')
    })

    it('opens the only stored design for an id that is no id, putting its id in the URL', async () => {
      const arranged = await arrange({ hash: '#/design/Not_An_Id/layout', stored: [intact(older)] })

      await arranged.launch()

      expect(opened(arranged)).toEqual({ id: anId('older'), name: 'Older' })
      expect(location.hash).toBe('#/design/older/layout')
    })

    it('opens the newer when the URL names a broken older', async () => {
      const arranged = await arrange({
        hash: '#/design/older/layout',
        stored: [broken(older), intact(newer)],
      })

      await arranged.launch()

      expect(opened(arranged)).toEqual({ id: anId('newer'), name: 'Newer' })
    })

    it('opens a new design when the URL names the broken newest, trying only it', async () => {
      const arranged = await arrange({
        hash: '#/design/newer/layout',
        stored: [intact(older), broken(newer)],
      })

      await arranged.launch()

      expect(arranged.storedIds).not.toContain(opened(arranged).id)
    })

    it('opens a new design, not the newer, when the reset save is refused for space', async () => {
      // Two one-version designs fill a capacity of two, so the reset point has no room.
      const stored = { ...intact(older), texts: { ...textsOf(older), routing: 'revision "r1" {' } }
      const arranged = await arrange({
        hash: '#/design/older/layout',
        stored: [stored, intact(newer)],
        storage: { backend: new MemoryBackend({ capacity: 2 }) },
      })

      await arranged.launch()

      expect(arranged.storedIds).not.toContain(opened(arranged).id)
      expect(await keptTexts(arranged, anId('older'))).toEqual([
        Result.ok(Option.some(stored.texts)),
      ])
    })
  })

  describe("when browser storage can't be opened", () => {
    it.each([
      ['at listDesigns', ''],
      ["at the action's load", '#/design/older/layout'],
    ])(
      'opens a new design %s, whose failed autosave holds storage-unavailable',
      async (_role, hash) => {
        const arranged = await arrange({
          hash,
          storage: { database: aDatabase(), factory: insecureFactory() },
        })

        await arranged.launch()

        expect(arranged.storedIds).not.toContain(opened(arranged).id)
        await expect
          .poll(() => arranged.autosave.failure)
          .toEqual(
            Option.some({ kind: 'storage-unavailable', message: `SecurityError: ${insecure}` }),
          )
      },
    )
  })

  describe('the workspace', () => {
    it.each([
      ['an unknown one', '#/design/older/bogus'],
      ['a missing one', '#/design/older'],
    ])('opens layout for %s, putting it in the URL', async (_role, hash) => {
      const arranged = await arrange({ hash, stored: [intact(older)] })

      await arranged.launch()

      expect(location.hash).toBe('#/design/older/layout')
    })

    it("starts the model worker on the URL's workspace", async () => {
      const arranged = await arrange({ hash: '#/design/older/pcb', stored: [intact(older)] })

      await arranged.launch()

      expect(arranged.workers).toHaveLength(1)
      expect(arranged.workers[0]?.received).toContainEqual(
        expect.objectContaining({ kind: 'focus', workspace: 'pcb' }),
      )
    })

    it("sends the model worker focus on a switch by a workspace's key", async () => {
      const arranged = await arrange({ hash: '#/design/older/layout', stored: [intact(older)] })
      await arranged.launch()

      await userEvent.keyboard('3')

      await expect
        .poll(() => arranged.workers[0]?.received.at(-1))
        .toMatchObject({ kind: 'focus', workspace: 'pcb' })
    })
  })

  describe('a reload', () => {
    it('reopens the design the first launch opened, showing it on the page', async () => {
      const database = aDatabase()
      const first = await arrange({ hash: '', storage: { database } })
      await first.launch()
      const { id } = opened(first)
      await expect
        .poll(async () => (await first.storage.listDesigns()).map((list) => list.map((d) => d.id)))
        .toMatchObject({ value: [id] })
      const hash = location.hash
      first.unmount()

      const second = await arrange({ hash, storage: { database } })
      await second.launch()

      expect(opened(second).id).toBe(id)
      const designs = await second.storage.listDesigns()
      expectOk(designs)
      expect(designs.value).toMatchObject([{ id }])
      await expect
        .element(page.getByRole('heading', { level: 1 }))
        .toHaveTextContent(opened(second).name)
    })
  })
})
