import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { type Design, designSchema, type Mutable, type Rejection } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { expectDeeplyFrozen, emptyLayoutDesign } from '../testing'
import { deepFreeze } from './deep-freeze'
import { DesignPatcher } from './design-patcher'
import type { Writable } from './types'

function arrange() {
  return {
    patcher: new DesignPatcher(),
    design: deepFreeze(v.parse(designSchema, emptyLayoutDesign())),
  }
}

describe('DesignPatcher', () => {
  it('returns the changed design and its patches', () => {
    const { patcher, design } = arrange()

    const changed = patcher.change(design, (draft) => {
      draft.meta.name = 'Corne v2'
    })

    expectOk(changed)
    expect(changed.value).toEqual({
      design: { ...design, meta: { ...design.meta, name: 'Corne v2' } },
      patches: [{ op: 'replace', path: ['meta', 'name'], value: 'Corne v2' }],
    })
  })

  it('returns the rejection an edit returns and leaves the design as it was', () => {
    const { patcher, design } = arrange()
    const rejection: Rejection = { kind: 'unavailable', command: 'test.refuse' }

    const changed = patcher.change(design, (draft) => {
      draft.meta.name = 'discarded'
      return rejection
    })

    expectErr(changed)
    expect(changed.error).toBe(rejection)
    expect(design).toEqual(v.parse(designSchema, emptyLayoutDesign()))
  })

  it('replays patches into the same design, deeply frozen', () => {
    const { patcher, design } = arrange()
    const changed = patcher.change(design, (draft) => {
      draft.meta.form = { type: 'unibody' }
    })
    expectOk(changed)

    const replayed = patcher.apply(design, changed.value.patches)

    expect(replayed).toEqual(changed.value.design)
    expectDeeplyFrozen(replayed)
  })

  it('freezes what an edit adds', () => {
    const { patcher, design } = arrange()

    const changed = patcher.change(design, (draft) => {
      draft.meta.form = { type: 'unibody' }
    })
    expectOk(changed)

    expectDeeplyFrozen(changed.value.design)
  })
})

describe('Writable', () => {
  it('is assignable to Mutable', () => {
    expectTypeOf<Writable<Design>>().toExtend<Mutable<Design>>()
  })
})
