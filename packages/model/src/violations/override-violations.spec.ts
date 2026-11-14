import type { Override } from '@keeb-cad/schema'
import {
  aFreeGroup,
  aLayout,
  anId,
  aPartRef,
  aSideComponentOverride,
  aSideId,
  aSidePartOverride,
  aSlot,
  aSplitForm,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { overrideNotAllowedMessage } from './override-not-allowed-message'
import { overrideViolations } from './override-violations'
import { unresolvableReferenceMessage } from './unresolvable-reference-message'

const REVERSIBLE = aSplitForm({ board: 'reversible' })

// a is a free slot under the root, g a free group.
const layout = () =>
  aLayout({ id: anId('root'), children: [aSlot({ id: anId('a') }), aFreeGroup({ id: anId('g') })] })

const removal = (target: string) => aSidePartOverride({ target: aSideId(target), part: null })
const swap = (target: string) =>
  aSidePartOverride({ target: aSideId(target), part: aPartRef('key') })

function unresolvable(target: string) {
  const ids = [aSideId(target)]
  return {
    kind: 'unresolvable-reference',
    severity: 'warning',
    ids,
    message: unresolvableReferenceMessage('override', ids),
    fixes: [],
  }
}

function notAllowed(target: string) {
  const ids = [aSideId(target)]
  return {
    kind: 'override-not-allowed',
    severity: 'error',
    ids,
    message: overrideNotAllowedMessage(ids),
    fixes: [],
  }
}

describe('overrideViolations', () => {
  it.each<[string, Override, string]>([
    ['a removal on an id the design lacks', removal('right/zz'), 'right/zz'],
    ['a removal on a group', removal('right/g'), 'right/g'],
    ['a swap on an id the design lacks, and nothing else', swap('right/zz'), 'right/zz'],
    [
      'a side-component override on an id the design lacks',
      aSideComponentOverride({ target: aSideId('right/zz') }),
      'right/zz',
    ],
  ])('warns of %s as unresolvable, naming the target', (_role, override, target) => {
    expect(overrideViolations([override], layout(), REVERSIBLE)).toEqual([unresolvable(target)])
  })

  it('reports a swap on a reversible board as override-not-allowed, naming the target', () => {
    expect(overrideViolations([swap('right/a')], layout(), REVERSIBLE)).toEqual([
      notAllowed('right/a'),
    ])
  })

  it.each<[string, Override]>([
    ['a removal on a slot', removal('right/a')],
    ['a side-component override on a slot', aSideComponentOverride({ target: aSideId('right/a') })],
  ])('reports nothing for %s', (_role, override) => {
    expect(overrideViolations([override], layout(), REVERSIBLE)).toEqual([])
  })

  it("lists the overrides' violations in the list's order", () => {
    expect(
      overrideViolations([swap('right/a'), removal('right/zz')], layout(), REVERSIBLE),
    ).toEqual([notAllowed('right/a'), unresolvable('right/zz')])
  })
})
