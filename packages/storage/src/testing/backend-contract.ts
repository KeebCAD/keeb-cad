import { Option } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { anId, aRevision } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import type { StoredVersion } from '../backend/types'
import type { MakeBackend } from './types'

function aStoredVersion(overrides: Partial<StoredVersion> = {}): StoredVersion {
  return {
    designId: anId('corne'),
    name: 'Corne',
    revision: aRevision(),
    reason: 'autosave',
    savedAt: 1000,
    texts: { design: 'design text', routing: 'routing text', fingerprints: 'fingerprints text' },
    ...overrides,
  }
}

// What every storage backend does, run against each one.
export function backendContract(make: MakeBackend): void {
  describe('the storage backend contract', () => {
    it('allocates a save counter that only rises, past a deleted newest version too', async () => {
      const backend = make()

      const first = await backend.write(aStoredVersion(), [])
      const second = await backend.write(aStoredVersion({ designId: anId('lily') }), [])
      expectOk(second)
      expectOk(await backend.delete([second.value]))
      const third = await backend.write(aStoredVersion(), [])

      expectOk(first)
      expectOk(third)
      expect(second.value).toBeGreaterThan(first.value)
      expect(third.value).toBeGreaterThan(second.value)
    })

    it('puts a version and deletes the versions it replaces in one write', async () => {
      const backend = make()
      const replaced = await backend.write(
        aStoredVersion({ designId: anId('corne'), revision: aRevision('r1') }),
        [],
      )
      expectOk(replaced)

      const written = await backend.write(
        aStoredVersion({
          designId: anId('corne'),
          name: 'Corne',
          revision: aRevision('r2'),
          reason: 'autosave',
          savedAt: 1000,
        }),
        [replaced.value],
      )

      expectOk(written)
      const versions = await backend.versions(anId('corne'))
      expectOk(versions)
      expect(versions.value).toEqual([
        {
          version: written.value,
          name: 'Corne',
          revision: 'r2',
          reason: 'autosave',
          savedAt: 1000,
        },
      ])
      const read = await backend.read(replaced.value)
      expectOk(read)
      expect(read.value).toEqual(Option.none())
    })

    it("lists a design's versions without their texts, and none of another design's", async () => {
      const backend = make()
      const autosave = await backend.write(
        aStoredVersion({
          designId: anId('corne'),
          name: 'Corne',
          revision: aRevision('r1'),
          reason: 'autosave',
          savedAt: 1000,
        }),
        [],
      )
      const reset = await backend.write(
        aStoredVersion({
          designId: anId('corne'),
          name: 'Corne',
          revision: aRevision('r1'),
          reason: 'reset',
          savedAt: 2000,
        }),
        [],
      )
      expectOk(await backend.write(aStoredVersion({ designId: anId('lily') }), []))

      const versions = await backend.versions(anId('corne'))

      expectOk(autosave)
      expectOk(reset)
      expectOk(versions)
      expect(versions.value.toSorted((a, b) => a.version - b.version)).toEqual([
        {
          version: autosave.value,
          name: 'Corne',
          revision: 'r1',
          reason: 'autosave',
          savedAt: 1000,
        },
        { version: reset.value, name: 'Corne', revision: 'r1', reason: 'reset', savedAt: 2000 },
      ])
    })

    it('lists each stored design as its newest write left it', async () => {
      const backend = make()
      expectOk(await backend.write(aStoredVersion({ designId: anId('corne'), name: 'Corne' }), []))
      const renamed = await backend.write(
        aStoredVersion({
          designId: anId('corne'),
          name: 'Corne v2',
          revision: aRevision('r2'),
          savedAt: 2000,
        }),
        [],
      )
      const lily = await backend.write(
        aStoredVersion({
          designId: anId('lily'),
          name: 'Lily',
          revision: aRevision('r1'),
          savedAt: 1000,
        }),
        [],
      )

      const designs = await backend.designs()

      expectOk(renamed)
      expectOk(lily)
      expectOk(designs)
      expect(designs.value.toSorted((a, b) => a.lastVersion - b.lastVersion)).toEqual([
        {
          id: 'corne',
          name: 'Corne v2',
          revision: 'r2',
          lastVersion: renamed.value,
          savedAt: 2000,
        },
        { id: 'lily', name: 'Lily', revision: 'r1', lastVersion: lily.value, savedAt: 1000 },
      ])
    })

    it('reads back the texts a version was written with', async () => {
      const backend = make()
      const texts = {
        design: 'another design',
        routing: 'another routing',
        fingerprints: 'another fingerprints',
      }
      const written = await backend.write(aStoredVersion({ texts }), [])
      expectOk(written)

      const read = await backend.read(written.value)

      expectOk(read)
      expect(read.value).toEqual(Option.some(texts))
    })

    it('reads nothing for a version not stored', async () => {
      const backend = make()

      const read = await backend.read(1)

      expectOk(read)
      expect(read.value).toEqual(Option.none())
    })

    it('deletes the versions it is given and keeps the rest', async () => {
      const backend = make()
      const deleted = await backend.write(
        aStoredVersion({ designId: anId('corne'), revision: aRevision('r1') }),
        [],
      )
      const kept = await backend.write(
        aStoredVersion({
          designId: anId('corne'),
          name: 'Corne',
          revision: aRevision('r2'),
          reason: 'autosave',
          savedAt: 1000,
        }),
        [],
      )
      expectOk(deleted)
      expectOk(kept)

      expectOk(await backend.delete([deleted.value]))

      const versions = await backend.versions(anId('corne'))
      expectOk(versions)
      expect(versions.value).toEqual([
        { version: kept.value, name: 'Corne', revision: 'r2', reason: 'autosave', savedAt: 1000 },
      ])
    })

    it('lists no designs and no versions when nothing is stored', async () => {
      const backend = make()

      const designs = await backend.designs()
      const versions = await backend.versions(anId('corne'))

      expectOk(designs)
      expectOk(versions)
      expect({ designs: designs.value, versions: versions.value }).toEqual({
        designs: [],
        versions: [],
      })
    })
  })
}
