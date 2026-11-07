import { Option } from '@keeb-cad/result'
import { aRevision } from '@keeb-cad/schema/testing'
import type { VersionReason } from '@keeb-cad/schema'
import { describe, expect, it } from 'vitest'

import type { VersionSummary } from '../backend/types'
import { pruneCandidate, replacedBy, rollingVersions } from './retention'

function aSummary(
  version: number,
  revision: string,
  reason: VersionReason = 'autosave',
): VersionSummary {
  return { version, revision: aRevision(revision), reason, savedAt: 1000 }
}

// Autosaves 1…count, each at its own revision r1…rcount.
function autosaves(count: number): VersionSummary[] {
  return Array.from({ length: count }, (_, index) => aSummary(index + 1, `r${index + 1}`))
}

describe('replacedBy', () => {
  it('replaces nothing on the first save', () => {
    expect(replacedBy([], aRevision('r1'), 'autosave')).toEqual([])
  })

  it("replaces an autosave's revision's autosave", () => {
    expect(replacedBy(autosaves(3), aRevision('r2'), 'autosave')).toEqual([2])
  })

  it('replaces no reset at the revision of an autosave', () => {
    expect(replacedBy([aSummary(1, 'r1', 'reset')], aRevision('r1'), 'autosave')).toEqual([])
  })

  it.each([
    ['an autosave', autosaves(3)],
    ['a reset', [aSummary(1, 'r1', 'reset')]],
  ])('replaces nothing for a reset at the revision of %s', (_role, versions) => {
    expect(replacedBy(versions, aRevision('r1'), 'reset')).toEqual([])
  })

  it.each([
    ['one below the cap, replacing nothing', rollingVersions - 2, []],
    ['up to the cap, replacing nothing', rollingVersions - 1, []],
    ['one past the cap, replacing the oldest', rollingVersions, [1]],
  ])('takes a new revision %s', (_role, stored, expected) => {
    expect(replacedBy(autosaves(stored), aRevision('new'), 'autosave')).toEqual(expected)
  })

  it('takes a revision at the cap in its own slot, replacing nothing else', () => {
    expect(replacedBy(autosaves(rollingVersions), aRevision('r5'), 'autosave')).toEqual([5])
  })

  it('counts no reset against the cap', () => {
    const versions = [aSummary(100, 'reset-point', 'reset'), ...autosaves(rollingVersions - 1)]

    expect(replacedBy(versions, aRevision('new'), 'autosave')).toEqual([])
  })

  it('replaces the oldest autosave past the cap by save order, not list order', () => {
    const versions = autosaves(rollingVersions).toReversed()

    expect(replacedBy(versions, aRevision('new'), 'autosave')).toEqual([1])
  })
})

describe('pruneCandidate', () => {
  it('keeps the newest version when it is the newer of two autosaves', () => {
    expect(pruneCandidate([aSummary(2, 'r2'), aSummary(1, 'r1')])).toEqual(Option.some(1))
  })

  it('picks an older autosave over a newest reset', () => {
    expect(pruneCandidate([aSummary(2, 'r2', 'reset'), aSummary(1, 'r1')])).toEqual(Option.some(1))
  })

  it('picks the oldest autosave by save order', () => {
    const versions = [
      aSummary(4, 'r4'),
      aSummary(3, 'r3'),
      aSummary(1, 'r1', 'reset'),
      aSummary(2, 'r2'),
    ]

    expect(pruneCandidate(versions)).toEqual(Option.some(2))
  })

  it.each([
    ['only named points are kept', [aSummary(1, 'r1', 'reset')]],
    ['the only autosave is the newest version', [aSummary(1, 'r1', 'reset'), aSummary(2, 'r2')]],
    ['nothing is kept', []],
  ])('picks none when %s', (_role, versions) => {
    expect(pruneCandidate(versions)).toEqual(Option.none())
  })
})
