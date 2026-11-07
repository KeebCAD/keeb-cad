import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { anId, aRevision } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import type { StoredVersion, VersionId } from '../backend/types'
import { backendContract } from './backend-contract'
import { MemoryBackend } from './memory-backend'

const capacity = 3

function aVersionAt(revision: string): StoredVersion {
  return {
    designId: anId('corne'),
    name: 'Corne',
    revision: aRevision(revision),
    reason: 'autosave',
    savedAt: 1000,
    texts: { design: 'design text', routing: 'routing text', fingerprints: 'fingerprints text' },
  }
}

async function arrange(stored: number) {
  const backend = new MemoryBackend({ capacity })
  const ids: VersionId[] = []
  for (let index = 0; index < stored; index += 1) {
    const written = await backend.write(aVersionAt(`r${index}`), [])
    ids.push(
      written.match({
        ok: (id) => id,
        err: (error) => {
          throw new Error(`Expected the arranged write to succeed: ${error.message}`)
        },
      }),
    )
  }
  return { backend, ids }
}

describe('MemoryBackend', () => {
  backendContract(() => new MemoryBackend())

  it.each([
    ['one below its capacity', capacity - 2],
    ['at its capacity', capacity - 1],
  ])('takes a write that leaves it %s', async (_role, stored) => {
    const { backend } = await arrange(stored)

    const written = await backend.write(aVersionAt('new'), [])

    expectOk(written)
  })

  it('refuses a write one past its capacity as a QuotaExceededError, keeping what it holds', async () => {
    const { backend, ids } = await arrange(capacity)

    const written = await backend.write(aVersionAt('new'), [])

    expectErr(written)
    expect(written.error).toEqual({
      name: 'QuotaExceededError',
      message: `The memory backend holds at most ${capacity} versions.`,
    })
    const versions = await backend.versions(anId('corne'))
    expectOk(versions)
    expect(versions.value).toEqual([
      { version: ids[0], name: 'Corne', revision: 'r0', reason: 'autosave', savedAt: 1000 },
      { version: ids[1], name: 'Corne', revision: 'r1', reason: 'autosave', savedAt: 1000 },
      { version: ids[2], name: 'Corne', revision: 'r2', reason: 'autosave', savedAt: 1000 },
    ])
  })

  it('takes a write at its capacity that replaces one of its versions', async () => {
    const { backend, ids } = await arrange(capacity)

    const written = await backend.write(aVersionAt('new'), ids.slice(0, 1))

    expectOk(written)
  })
})
