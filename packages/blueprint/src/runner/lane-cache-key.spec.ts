import { aBlueprintDeclaration, aBlueprintId, aVersion } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { closureKeyOf } from '../pool/pin-key'
import { aLibraryData } from '../testing/a-library-data'
import { laneCacheKey } from './lane-cache-key'
import { resolveClosure } from './resolve-closure'
import type { LaneCacheKeyParts } from './types'

const CALLER = aBlueprintId('lib:blueprint/caller')
const MIDDLE = aBlueprintId('lib:blueprint/middle')
const LEAF = aBlueprintId('lib:blueprint/leaf')

const parts = (overrides: Partial<LaneCacheKeyParts> = {}): LaneCacheKeyParts => ({
  lane: { id: 'lib:blueprint/test', version: 1, stage: 'parts', stageVersion: 1 },
  closureKey: '',
  canonical: { width: '19mm' },
  ...overrides,
})

function closureKeyWithLeafAt(leafVersion: number): string {
  const min = aVersion()
  const { declarations } = aLibraryData([
    { declaration: aBlueprintDeclaration({ id: CALLER, uses: [{ id: MIDDLE, minVersion: min }] }) },
    { declaration: aBlueprintDeclaration({ id: MIDDLE, uses: [{ id: LEAF, minVersion: min }] }) },
    { declaration: aBlueprintDeclaration({ id: LEAF, version: aVersion(leafVersion) }) },
  ])
  const pins = new Map([
    [MIDDLE, aVersion()],
    [LEAF, aVersion(leafVersion)],
  ])
  const resolved = resolveClosure(declarations, { id: CALLER, version: min }, pins)
  return resolved.match({
    some: ({ closure }) =>
      closureKeyOf({ closure: closure.map((declaration) => ({ declaration, script: '' })) }),
    none: () => 'unresolved',
  })
}

describe('laneCacheKey', () => {
  it('is the same for the same parts', () => {
    expect(laneCacheKey(parts())).toBe(laneCacheKey(parts()))
  })

  it.each([
    ['one argument', parts({ canonical: { width: '20mm' } })],
    ['the blueprint version', parts({ lane: { ...parts().lane, version: 2 } })],
    ['the stage version', parts({ lane: { ...parts().lane, stageVersion: 2 } })],
    ['the stage', parts({ lane: { ...parts().lane, stage: 'plates' } })],
  ])('misses when %s changes', (_role, changed) => {
    expect(laneCacheKey(changed)).not.toBe(laneCacheKey(parts()))
  })

  it('misses when a version two levels down the closure changes', () => {
    const before = laneCacheKey(parts({ closureKey: closureKeyWithLeafAt(1) }))
    const after = laneCacheKey(parts({ closureKey: closureKeyWithLeafAt(2) }))

    expect(after).not.toBe(before)
  })
})
