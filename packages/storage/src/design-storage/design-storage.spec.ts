import { Container } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { VersionReason } from '@keeb-cad/schema'
import { aDesign, aFingerprintsFile, anId, aRevision, aRoutingFile } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { storageBackend } from '../backend/storage-backend'
import type { VersionSummary } from '../backend/types'
import { writeBundle } from '../bundle/write-bundle'
import { rollingVersions } from '../retention/retention'
import { storageModule } from '../storage-module'
import { MemoryBackend } from '../testing'
import { DesignStorage } from './design-storage'
import type { DesignLabel } from './types'

const savedAt = Date.UTC(2026, 10, 7, 12)

const unknownError = { name: 'UnknownError', message: 'The request failed.' }

// Fails the operations a test names, as a request on open browser storage does.
class FailingBackend extends MemoryBackend {
  readonly failing = new Set<'versions' | 'write' | 'delete'>()

  override versions(...arguments_: Parameters<MemoryBackend['versions']>) {
    return this.failing.has('versions')
      ? AsyncResult.err(unknownError)
      : super.versions(...arguments_)
  }

  // A count of writes to refuse for space, whatever room the capacity leaves: a version-count
  // capacity frees a slot with every prune, so it can't refuse twice in a row.
  refusalsForSpace = 0

  override write(...arguments_: Parameters<MemoryBackend['write']>) {
    if (this.failing.has('write')) return AsyncResult.err(unknownError)
    if (this.refusalsForSpace === 0) return super.write(...arguments_)
    this.refusalsForSpace -= 1
    return AsyncResult.err({ name: 'QuotaExceededError', message: 'The quota has been exceeded.' })
  }

  override delete(...arguments_: Parameters<MemoryBackend['delete']>) {
    return this.failing.has('delete') ? AsyncResult.err(unknownError) : super.delete(...arguments_)
  }
}

function arrange({ capacity }: { capacity?: number } = {}) {
  const backend = new FailingBackend({ capacity })
  const container = new Container().addModule(storageModule)
  container.override(storageBackend).useValue(backend)
  return { storage: container.resolve(DesignStorage), backend }
}

function texts() {
  return writeBundle({
    design: aDesign(),
    routing: aRoutingFile(),
    fingerprints: aFingerprintsFile(),
  })
}

function aLabel(revision: string, id = 'corne', name = 'Corne'): DesignLabel {
  return { id: anId(id), name, revision: aRevision(revision) }
}

async function save(
  storage: DesignStorage,
  revision: string,
  reason: VersionReason = 'autosave',
  id = 'corne',
) {
  const saved = await storage.save(aLabel(revision, id), texts(), reason)
  saved.match({
    ok: () => {},
    err: (error) => {
      throw new Error(`Expected the save at ${revision} to succeed: ${error.kind}`)
    },
  })
}

// Autosaves r1…rcount, oldest first.
async function autosave(storage: DesignStorage, count: number) {
  for (let index = 1; index <= count; index += 1) await save(storage, `r${index}`)
}

async function versionsOf(storage: DesignStorage, id = 'corne'): Promise<VersionSummary[]> {
  const versions = await storage.listVersions(anId(id))
  expectOk(versions)
  return versions.value
}

// Each kept version's revision and reason, newest first.
async function keptVersions(
  storage: DesignStorage,
  id = 'corne',
): Promise<[string, VersionReason][]> {
  return (await versionsOf(storage, id)).map(({ revision, reason }) => [revision, reason])
}

// rcount…r1, the autosaves autosave() leaves, newest first.
function autosavedRevisions(count: number, oldest = 1): [string, VersionReason][] {
  return Array.from({ length: count - oldest + 1 }, (_, index) => [`r${count - index}`, 'autosave'])
}

function fixTime() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(savedAt)
  onTestFinished(() => {
    vi.useRealTimers()
  })
}

describe('DesignStorage', () => {
  describe('save', () => {
    it('keeps one autosave version for the first save, replacing nothing', async () => {
      fixTime()
      const { storage } = arrange()

      await save(storage, 'r1')

      expect(await versionsOf(storage)).toEqual([
        { version: expect.any(Number), revision: 'r1', reason: 'autosave', savedAt },
      ])
    })

    it.each([
      ['the 19th autosave keeps every version', rollingVersions - 1, 1],
      ['the 20th autosave keeps every version', rollingVersions, 1],
      ['the 21st autosave prunes the oldest', rollingVersions + 1, 2],
    ])('%s', async (_role, count, oldestKept) => {
      const { storage } = arrange()

      await autosave(storage, count)

      expect(await keptVersions(storage)).toEqual(autosavedRevisions(count, oldestKept))
    })

    it('keeps a reset beside 20 autosaves when a 21st autosave prunes the oldest', async () => {
      const { storage } = arrange()
      await save(storage, 'reset-point', 'reset')
      await autosave(storage, rollingVersions)

      await save(storage, `r${rollingVersions + 1}`)

      expect(await keptVersions(storage)).toEqual([
        ...autosavedRevisions(rollingVersions + 1, 2),
        ['reset-point', 'reset'],
      ])
    })

    it('keeps 20 autosaves when one at a kept revision takes its slot, pruning nothing else', async () => {
      const { storage } = arrange()
      await autosave(storage, rollingVersions)

      await save(storage, 'r5')

      const revisions = autosavedRevisions(rollingVersions).filter(
        ([revision]) => revision !== 'r5',
      )
      expect(await keptVersions(storage)).toEqual([['r5', 'autosave'], ...revisions])
    })

    it('replaces the autosave at a revision saved again, newest', async () => {
      const { storage } = arrange()
      await save(storage, 'a')
      await save(storage, 'b')

      await save(storage, 'a')

      expect(await keptVersions(storage)).toEqual([
        ['a', 'autosave'],
        ['b', 'autosave'],
      ])
    })

    it('keeps a reset beside an autosave at its revision', async () => {
      const { storage } = arrange()
      await save(storage, 'r1', 'reset')

      await save(storage, 'r1')

      expect(await keptVersions(storage)).toEqual([
        ['r1', 'autosave'],
        ['r1', 'reset'],
      ])
    })

    it('keeps two resets at one revision', async () => {
      const { storage } = arrange()
      await save(storage, 'r1', 'reset')

      await save(storage, 'r1', 'reset')

      expect(await keptVersions(storage)).toEqual([
        ['r1', 'reset'],
        ['r1', 'reset'],
      ])
    })

    it('runs two saves at one revision one after the other, keeping one autosave', async () => {
      const { storage } = arrange()

      const saved = await Promise.all([
        storage.save(aLabel('r1'), texts(), 'autosave'),
        storage.save(aLabel('r1'), texts(), 'autosave'),
      ])

      expect(saved.map((result) => result.kind)).toEqual(['ok', 'ok'])
      expect(await keptVersions(storage)).toEqual([['r1', 'autosave']])
    })
  })

  describe('save, refused for space', () => {
    it('drops the older of two autosaves, keeping the newest, and saves', async () => {
      const { storage } = arrange({ capacity: 2 })
      await autosave(storage, 2)

      await save(storage, 'r3')

      expect(await keptVersions(storage)).toEqual([
        ['r3', 'autosave'],
        ['r2', 'autosave'],
      ])
    })

    it("returns quota-exceeded, keeping the one autosave left as its design's newest", async () => {
      const { storage } = arrange({ capacity: 1 })
      await autosave(storage, 1)

      const saved = await storage.save(aLabel('r2'), texts(), 'autosave')

      expectErr(saved)
      expect(saved.error).toEqual({ kind: 'quota-exceeded' })
      expect(await keptVersions(storage)).toEqual([['r1', 'autosave']])
    })

    it('drops the older of two autosaves and saves a reset', async () => {
      const { storage } = arrange({ capacity: 2 })
      await autosave(storage, 2)

      await save(storage, 'r3', 'reset')

      expect(await keptVersions(storage)).toEqual([
        ['r3', 'reset'],
        ['r2', 'autosave'],
      ])
    })

    it('drops the two older of three autosaves in turn and saves on the third try', async () => {
      const { storage, backend } = arrange()
      await autosave(storage, 3)
      backend.refusalsForSpace = 2

      await save(storage, 'r4', 'reset')

      expect(await keptVersions(storage)).toEqual([
        ['r4', 'reset'],
        ['r3', 'autosave'],
      ])
    })

    it('returns quota-exceeded with no autosave left, keeping the reset', async () => {
      const { storage } = arrange({ capacity: 1 })
      await save(storage, 'r1', 'reset')

      const saved = await storage.save(aLabel('r2'), texts(), 'autosave')

      expectErr(saved)
      expect(saved.error).toEqual({ kind: 'quota-exceeded' })
      expect(await keptVersions(storage)).toEqual([['r1', 'reset']])
    })

    it("returns quota-exceeded when only another design's autosaves could be dropped, leaving both designs' versions", async () => {
      const { storage } = arrange({ capacity: 3 })
      await save(storage, 'l1', 'autosave', 'lily')
      await save(storage, 'l2', 'autosave', 'lily')
      await save(storage, 'r1')

      const saved = await storage.save(aLabel('r2'), texts(), 'autosave')

      expectErr(saved)
      expect(saved.error).toEqual({ kind: 'quota-exceeded' })
      expect(await keptVersions(storage, 'lily')).toEqual([
        ['l2', 'autosave'],
        ['l1', 'autosave'],
      ])
      expect(await keptVersions(storage)).toEqual([['r1', 'autosave']])
    })
  })

  describe('save, when a request fails', () => {
    const unavailable = {
      kind: 'storage-unavailable',
      message: 'UnknownError: The request failed.',
    }

    it('returns storage-unavailable when listing the versions fails', async () => {
      const { storage, backend } = arrange()
      backend.failing.add('versions')

      const saved = await storage.save(aLabel('r1'), texts(), 'autosave')

      expectErr(saved)
      expect(saved.error).toEqual(unavailable)
    })

    it('returns storage-unavailable when the write fails, pruning no autosave', async () => {
      const { storage, backend } = arrange()
      await autosave(storage, 2)
      backend.failing.add('write')

      const saved = await storage.save(aLabel('r3'), texts(), 'autosave')

      expectErr(saved)
      expect(saved.error).toEqual(unavailable)
      expect(await keptVersions(storage)).toEqual(autosavedRevisions(2))
    })

    it('returns storage-unavailable when pruning after a refusal fails', async () => {
      const { storage, backend } = arrange({ capacity: 2 })
      await autosave(storage, 2)
      backend.failing.add('delete')

      const saved = await storage.save(aLabel('r3'), texts(), 'autosave')

      expectErr(saved)
      expect(saved.error).toEqual(unavailable)
      expect(await keptVersions(storage)).toEqual(autosavedRevisions(2))
    })
  })

  describe('listVersions', () => {
    it('orders two saves made at one time newest first, by save order', async () => {
      fixTime()
      const { storage } = arrange()
      await save(storage, 'r1', 'reset')
      await save(storage, 'r1')

      const versions = await versionsOf(storage)

      expect(versions).toEqual([
        { version: expect.any(Number), revision: 'r1', reason: 'autosave', savedAt },
        { version: expect.any(Number), revision: 'r1', reason: 'reset', savedAt },
      ])
    })

    it('lists no versions for a design not stored', async () => {
      const { storage } = arrange()

      expect(await versionsOf(storage, 'unknown')).toEqual([])
    })
  })

  describe('listDesigns', () => {
    it('lists two designs saved at one time with the later save first', async () => {
      fixTime()
      const { storage } = arrange()
      expectOk(await storage.save(aLabel('r1', 'corne', 'Corne'), texts(), 'autosave'))
      expectOk(await storage.save(aLabel('r2', 'lily', 'Lily58'), texts(), 'autosave'))

      const designs = await storage.listDesigns()

      expectOk(designs)
      expect(designs.value).toEqual([
        { id: 'lily', name: 'Lily58', revision: 'r2', savedAt },
        { id: 'corne', name: 'Corne', revision: 'r1', savedAt },
      ])
    })

    it("lists a design by its latest save's name and revision", async () => {
      fixTime()
      const { storage } = arrange()
      expectOk(await storage.save(aLabel('r1', 'corne', 'Corne'), texts(), 'autosave'))
      expectOk(await storage.save(aLabel('r2', 'lily', 'Lily58'), texts(), 'autosave'))
      expectOk(await storage.save(aLabel('r3', 'corne', 'Corne v2'), texts(), 'autosave'))

      const designs = await storage.listDesigns()

      expectOk(designs)
      expect(designs.value).toEqual([
        { id: 'corne', name: 'Corne v2', revision: 'r3', savedAt },
        { id: 'lily', name: 'Lily58', revision: 'r2', savedAt },
      ])
    })

    it('lists no designs when nothing is stored', async () => {
      const { storage } = arrange()

      const designs = await storage.listDesigns()

      expectOk(designs)
      expect(designs.value).toEqual([])
    })
  })

  describe('load', () => {
    it("returns the newest version's bundle migrated, its text as read and its label", async () => {
      const { storage } = arrange()
      await save(storage, 'r1')
      const newest = writeBundle({
        design: aDesign(),
        routing: aRoutingFile({ revision: aRevision('r2') }),
        fingerprints: aFingerprintsFile(),
      })
      expectOk(await storage.save(aLabel('r2', 'corne', 'Corne v2'), newest, 'reset'))

      const loaded = await storage.load(anId('corne'))

      expectOk(loaded)
      expect(loaded.value).toEqual({
        migrated: {
          design: aDesign(),
          routing: aRoutingFile({ revision: aRevision('r2') }),
          fingerprints: aFingerprintsFile(),
          unreadable: [],
        },
        asRead: newest,
        label: { id: 'corne', name: 'Corne v2', revision: 'r2' },
      })
    })

    it('returns not-found naming an id not stored', async () => {
      const { storage } = arrange()
      await save(storage, 'r1')

      const loaded = await storage.load(anId('unknown'))

      expectErr(loaded)
      expect(loaded.error).toEqual({ kind: 'not-found', id: 'unknown' })
    })

    it("returns the LoadError of a stored design file that can't be read", async () => {
      const { storage } = arrange()
      expectOk(await storage.save(aLabel('r1'), { ...texts(), design: 'meta {' }, 'autosave'))

      const loaded = await storage.load(anId('corne'))

      expectErr(loaded)
      expect(loaded.error).toMatchObject({ kind: 'file-unreadable', file: 'design' })
    })
  })
})
