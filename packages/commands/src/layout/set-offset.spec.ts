import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Node, Parameter } from '@keeb-cad/schema'
import {
  aDesign,
  aLayout,
  anExpression,
  anId,
  aParameter,
  aParameterName,
  aSlot,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { settled } from '../testing/settled'
import { layoutCommandsModule } from './layout-commands-module'
import { SetOffset } from './set-offset'

const A = anId('a')
const B = anId('b')

async function arrange({ children, parameters = [] }: Arrangement) {
  const container = new Container().addModule(designModule).addModule(layoutCommandsModule)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  expectOk(
    store.replaceDesign({
      design: aDesign({ parameters, layout: aLayout({ children }) }),
      unreadable: [],
    }),
  )
  return store
}

type Arrangement = { children: Node[]; parameters?: Parameter[] }

describe('SetOffset', () => {
  it('has the command id layout.setOffset and the label Set offset', () => {
    expect({ id: SetOffset.id, label: SetOffset.label }).toEqual({
      id: 'layout.setOffset',
      label: 'Set offset',
    })
  })
})

describe('SetOffset through the store', () => {
  it.each([
    ['a null position on a node with no offset', { ids: [A], position: null }],
    ['an edit with no field', { ids: [A] }],
  ])('commits nothing for %s, leaving nothing to undo', async (_role, input) => {
    const store = await arrange({ children: [aSlot({ id: A })] })
    const before = store.current.getOrUndefined()

    expectOk(store.run(SetOffset, input))

    expect(store.current.getOrUndefined()).toBe(before)
    expectErr(store.undo())
  })

  it('refuses a parameter in mm on the rotation with unit-mismatch from both run and availability', async () => {
    const w = aParameter({ name: aParameterName('w'), value: anExpression('2mm') })
    const store = await arrange({ children: [aSlot({ id: A }), aSlot({ id: B })], parameters: [w] })
    const before = store.current.getOrUndefined()
    const input = { ids: [A, B], rotation: 'w' }

    const available = store.available(SetOffset, input)
    const run = store.run(SetOffset, input)

    expect({
      available: settled(available),
      run: settled(run),
      unchanged: store.current.getOrUndefined() === before,
    }).toMatchObject({
      available: { kind: 'unit-mismatch', ids: [A, B] },
      run: { kind: 'unit-mismatch', ids: [A, B] },
      unchanged: true,
    })
  })

  it.each([
    ['no ids', { ids: [] }, ['ids']],
    ['a rotation in mm', { ids: [A], rotation: '5mm' }, ['rotation']],
  ])('refuses %s with input-invalid at that field', async (_role, input, path) => {
    const store = await arrange({ children: [aSlot({ id: A })] })

    const result = store.run(SetOffset, input)

    expectErr(result)
    expect(result.error).toMatchObject({
      kind: 'input-invalid',
      command: 'layout.setOffset',
      issues: [{ path }],
    })
  })
})
