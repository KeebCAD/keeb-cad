import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Form, Override } from '@keeb-cad/schema'
import {
  aDesign,
  aFreeGroup,
  aLayout,
  aMeta,
  anId,
  aPartRef,
  aSideId,
  aSidePartOverride,
  aSlot,
  aSplitForm,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { overrideNotAllowedMessage } from '../violations/override-not-allowed-message'
import { unknownOverrideTargetMessage } from '../violations/unknown-override-target-message'
import { checkSetOverride } from './check-set-override'

const REVERSIBLE = aSplitForm({ board: 'reversible' })
const MIRRORED = aSplitForm({ board: 'mirrored' })

// a and b are free slots under the root, g a free group.
function arrange(form: Form) {
  return aDesign({
    meta: aMeta({ form }),
    layout: aLayout({
      id: anId('root'),
      children: [aSlot({ id: anId('a') }), aSlot({ id: anId('b') }), aFreeGroup({ id: anId('g') })],
    }),
  })
}

const removal = (target: string) => aSidePartOverride({ target: aSideId(target), part: null })
const swap = (target: string) =>
  aSidePartOverride({ target: aSideId(target), part: aPartRef('key') })

describe('checkSetOverride', () => {
  it('refuses a swap on a reversible board with override-not-allowed, naming the target', () => {
    const ids = [aSideId('right/a')]

    const result = checkSetOverride(arrange(REVERSIBLE), swap('right/a'))

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'override-not-allowed',
      ids,
      message: overrideNotAllowedMessage(ids),
    })
  })

  it.each<[string, Form, Override]>([
    ['a swap on a mirrored board', MIRRORED, swap('right/a')],
    ['a removal on a reversible board', REVERSIBLE, removal('right/a')],
  ])('passes %s', (_role, form, override) => {
    expectOk(checkSetOverride(arrange(form), override))
  })

  it.each([
    ['a removal on an id the design lacks', removal('left/zz')],
    ['a removal on a group', removal('left/g')],
    ['a swap on an id the design lacks, before the swap', swap('left/zz')],
  ])('refuses %s with unknown-target, naming the target', (_role, override) => {
    const ids = [override.target]

    const result = checkSetOverride(arrange(REVERSIBLE), override)

    expectErr(result)
    expect(result.error).toEqual({
      kind: 'unknown-target',
      ids,
      message: unknownOverrideTargetMessage(ids),
    })
  })
})
