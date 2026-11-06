import { aRevision } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { emptyDerivedFiles } from './empty-derived-files'

describe('emptyDerivedFiles', () => {
  it('gives a routing file with no routes and a fingerprints file with none, both at the revision', () => {
    const revision = aRevision()

    expect(emptyDerivedFiles(revision)).toEqual({
      routing: { revision },
      fingerprints: { revision, fingerprints: [] },
    })
  })
})
