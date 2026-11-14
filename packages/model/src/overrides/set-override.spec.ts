import type { Form, Override } from '@keeb-cad/schema'
import {
  aDesign,
  aLayout,
  aMeta,
  anId,
  aPartRef,
  aSideComponentOverride,
  aSideId,
  aSidePartOverride,
  aSlot,
  aSplitForm,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { overrideNotAllowedMessage } from '../violations/override-not-allowed-message'
import { setOverride } from './set-override'

// a and b are free slots under the root.
function arrange({
  form = aSplitForm({ board: 'reversible' }),
  overrides = [],
}: { form?: Form; overrides?: Override[] } = {}) {
  return aDesign({
    meta: aMeta({ form }),
    layout: aLayout({
      id: anId('root'),
      children: [aSlot({ id: anId('a') }), aSlot({ id: anId('b') })],
    }),
    overrides,
  })
}

const removal = () => aSidePartOverride({ target: aSideId('right/a'), part: null })
const swap = () => aSidePartOverride({ target: aSideId('right/a'), part: aPartRef('key') })
const component = () => aSideComponentOverride({ target: aSideId('right/a'), component: 'encoder' })

describe('setOverride', () => {
  it('keeps one override when the same one is set twice', () => {
    const design = arrange()

    const results = [setOverride(design, removal()), setOverride(design, removal())]

    expect({ results, overrides: design.overrides }).toEqual({
      results: [undefined, undefined],
      overrides: [removal()],
    })
  })

  it('replaces the side-part override on the same target in its place, keeping the side-component one', () => {
    const design = arrange({
      form: aSplitForm({ board: 'mirrored' }),
      overrides: [swap(), component()],
    })

    expect(setOverride(design, removal())).toBeUndefined()
    expect(design.overrides).toEqual([removal(), component()])
  })

  it('appends an override on a new key', () => {
    const design = arrange({ overrides: [removal()] })
    const other = aSidePartOverride({ target: aSideId('left/b'), part: null })

    expect(setOverride(design, other)).toBeUndefined()
    expect(design.overrides).toEqual([removal(), other])
  })

  it("returns its check's rejection for a swap on a reversible board, changing nothing", () => {
    const design = arrange()
    const ids = [aSideId('right/a')]

    expect({ result: setOverride(design, swap()), design }).toEqual({
      result: { kind: 'override-not-allowed', ids, message: overrideNotAllowedMessage(ids) },
      design: arrange(),
    })
  })
})
