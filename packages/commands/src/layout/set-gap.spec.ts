import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { unitMismatchMessage } from '@keeb-cad/model/main'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Parameter } from '@keeb-cad/schema'
import {
  aDesign,
  aGap,
  aLength,
  aMeta,
  anExpression,
  anId,
  aParameter,
  aParameterName,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { settled } from '../testing/settled'
import { layoutCommandsModule } from './layout-commands-module'
import { SetGap } from './set-gap'

const DESIGN_ID = anId('corne')

function arrangedDesign(parameters: Parameter[] = []) {
  return aDesign({
    meta: aMeta({ id: DESIGN_ID, gap: aGap({ x: aLength('1mm'), y: aLength('1mm') }) }),
    parameters,
  })
}

async function arrange(parameters: Parameter[] = []) {
  const container = new Container().addModule(designModule).addModule(layoutCommandsModule)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(store.replaceDesign({ design: arrangedDesign(parameters), unreadable: [] }))
  const gap = () => store.current.getOrUndefined()?.design.meta.gap
  return { store, gap }
}

describe('SetGap', () => {
  it('has the command id layout.setGap and the label Set gap', () => {
    expect({ id: SetGap.id, label: SetGap.label }).toEqual({
      id: 'layout.setGap',
      label: 'Set gap',
    })
  })
})

describe('SetGap through the store', () => {
  it('sets the given axis and keeps the other, one undo restoring the arranged gap', async () => {
    const { store, gap } = await arrange()

    expectOk(store.run(SetGap, { x: '5mm' }))
    const set = gap()
    expectOk(store.undo())

    expect({ set, undone: gap() }).toEqual({
      set: aGap({ x: aLength('5mm'), y: aLength('1mm') }),
      undone: aGap({ x: aLength('1mm'), y: aLength('1mm') }),
    })
  })

  it('refuses a parameter in deg with unit-mismatch from both run and availability', async () => {
    const wall = aParameter({ name: aParameterName('wall'), value: anExpression('5deg') })
    const { store } = await arrange([wall])
    const before = store.current.getOrUndefined()
    const expected = {
      kind: 'unit-mismatch',
      ids: [DESIGN_ID],
      message: unitMismatchMessage([DESIGN_ID]),
    }

    const available = store.available(SetGap, { x: 'wall' })
    const run = store.run(SetGap, { x: 'wall' })

    expect({
      available: settled(available),
      run: settled(run),
      unchanged: store.current.getOrUndefined() === before,
    }).toEqual({ available: expected, run: expected, unchanged: true })
  })

  it.each([
    ['an empty edit', {}],
    ['the text the gap already holds', { x: '1mm' }],
  ])('commits nothing for %s, leaving nothing to undo', async (_role, input) => {
    const { store } = await arrange()
    const before = store.current.getOrUndefined()

    expectOk(store.run(SetGap, input))

    expect(store.current.getOrUndefined()).toBe(before)
    expectErr(store.undo())
  })
})
