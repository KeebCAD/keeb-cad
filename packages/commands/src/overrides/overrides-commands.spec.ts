import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { checkSetOverride, setOverride } from '@keeb-cad/model/main'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Override } from '@keeb-cad/schema'
import {
  aDesign,
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

import { settled } from '../testing/settled'
import { overridesCommandsModule } from './overrides-commands-module'
import { SetOverride } from './set-override'

// a is a free slot under the root of a split, reversible design.
function aReversibleDesign() {
  return aDesign({
    meta: aMeta({ form: aSplitForm({ board: 'reversible' }) }),
    layout: aLayout({ id: anId('root'), children: [aSlot({ id: anId('a') })] }),
  })
}

const removal = () => aSidePartOverride({ target: aSideId('right/a'), part: null })
const swap = () => aSidePartOverride({ target: aSideId('right/a'), part: aPartRef('key') })

describe('SetOverride', () => {
  it('has the command id overrides.setOverride', () => {
    expect(SetOverride.id).toBe('overrides.setOverride')
  })

  it.each<[string, () => Extract<Override, { type: 'side-part' }>]>([
    ['a removal', removal],
    ['a swap', swap],
  ])('answers availability of %s with its check', (_role, override) => {
    const design = aReversibleDesign()

    expect(settled(new SetOverride().available(design, override()))).toEqual(
      settled(checkSetOverride(design, override())),
    )
  })

  it.each<[string, () => Extract<Override, { type: 'side-part' }>]>([
    ['a removal', removal],
    ['a swap', swap],
  ])(
    'applies %s by returning what setOverride returns and leaving the same draft',
    (_role, override) => {
      const viaCommand = aReversibleDesign()
      const viaOperation = aReversibleDesign()

      expect([new SetOverride().apply(viaCommand, override()), viaCommand]).toEqual([
        setOverride(viaOperation, override()),
        viaOperation,
      ])
    },
  )
})

describe('SetOverride through the store', () => {
  async function arrange() {
    const container = new Container().addModule(designModule).addModule(overridesCommandsModule)
    await container.autoLoad()
    const store = container.resolve(DesignStore)
    expectOk(store.replaceDesign({ design: aReversibleDesign(), unreadable: [] }))
    return store
  }

  it('refuses a swap on a reversible design with override-not-allowed, committing nothing', async () => {
    const store = await arrange()
    const before = store.current.getOrUndefined()

    const result = store.run(SetOverride, { type: 'side-part', target: 'right/a', part: 'key' })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'override-not-allowed', ids: ['right/a'] })
    expect(store.current.getOrUndefined()).toBe(before)
  })
})
