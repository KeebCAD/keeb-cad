import { type MigratedBundle } from '@keeb-cad/schema'
import { aDesign, aFingerprintsFile, aRoutingFile } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { emptiedFiles } from './emptied-files'

function aBundle(overrides: Partial<MigratedBundle> = {}): MigratedBundle {
  return {
    design: aDesign(),
    routing: aRoutingFile(),
    fingerprints: aFingerprintsFile(),
    unreadable: [],
    ...overrides,
  }
}

describe('emptiedFiles', () => {
  it.each([
    ['unreadable', aBundle({ routing: undefined, unreadable: ['routing'] })],
    ['invalid', aBundle({ routing: { revision: 3 } })],
    ['missing', aBundle({ routing: undefined })],
  ])('reports routing as %s', (reason, bundle) => {
    expect(emptiedFiles(bundle)).toEqual([{ file: 'routing', reason }])
  })

  it('reports nothing for a bundle whose files all parse', () => {
    expect(emptiedFiles(aBundle())).toEqual([])
  })

  it('lists routing before fingerprints', () => {
    expect(emptiedFiles(aBundle({ routing: undefined, fingerprints: undefined }))).toEqual([
      { file: 'routing', reason: 'missing' },
      { file: 'fingerprints', reason: 'missing' },
    ])
  })
})
