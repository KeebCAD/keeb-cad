import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { aDesign, anExpression, aParameter, aParameterName } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { settled } from '../testing/settled'
import { DeleteParameter } from './delete-parameter'
import { parametersCommandsModule } from './parameters-commands-module'
import { RenameParameter } from './rename-parameter'
import { SetParameter } from './set-parameter'

const wall = (value: string) =>
  aParameter({ name: aParameterName('wall'), value: anExpression(value) })

describe('SetParameter', () => {
  it('has the command id parameters.setParameter and the label Set parameter', () => {
    expect({ id: SetParameter.id, label: SetParameter.label }).toEqual({
      id: 'parameters.setParameter',
      label: 'Set parameter',
    })
  })

  it('is always available, even for a value that will fail to evaluate', () => {
    expect(settled(new SetParameter().available(aDesign(), wall('1mm / 0')))).toBe('ok')
  })

  it("applies by setting the named parameter's value in the draft", () => {
    const draft = aDesign({ parameters: [wall('1mm')] })

    new SetParameter().apply(draft, wall('2mm'))

    expect(draft.parameters).toEqual([wall('2mm')])
  })
})

describe('SetParameter through the store', () => {
  async function arrange() {
    const container = new Container().addModule(designModule).addModule(parametersCommandsModule)
    await container.autoLoad()
    const store = container.resolve(DesignStore)
    expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))
    return store
  }

  it.each([
    ['empty', ''],
    ['a unit word', 'mm'],
  ])('refuses a name that is %s with input-invalid, at the name', async (_role, name) => {
    const store = await arrange()

    const result = store.run(SetParameter, { name, value: '1mm' })

    expectErr(result)
    expect(result.error).toMatchObject({
      kind: 'input-invalid',
      command: 'parameters.setParameter',
      issues: [{ path: ['name'] }],
    })
  })

  it('refuses a value that divides by zero with division-by-zero, committing nothing', async () => {
    const store = await arrange()
    const before = store.current.getOrUndefined()

    const result = store.run(SetParameter, { name: 'wall', value: '1mm / 0' })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'division-by-zero', ids: ['wall'] })
    expect(store.current.getOrUndefined()).toBe(before)
  })
})

describe('RenameParameter and DeleteParameter', () => {
  it.each([
    [RenameParameter, 'parameters.renameParameter', 'Rename parameter'],
    [DeleteParameter, 'parameters.deleteParameter', 'Delete parameter'],
  ])('has its command id and label', (command, expectedId, expectedLabel) => {
    expect({ id: command.id, label: command.label }).toEqual({
      id: expectedId,
      label: expectedLabel,
    })
  })
})

describe('RenameParameter and DeleteParameter through the store', () => {
  async function arrange() {
    const container = new Container().addModule(designModule).addModule(parametersCommandsModule)
    await container.autoLoad()
    const store = container.resolve(DesignStore)
    expectOk(
      store.replaceDesign({ design: aDesign({ parameters: [wall('1mm')] }), unreadable: [] }),
    )
    return store
  }

  it.each([
    ['a rename to', RenameParameter, { from: 'wall', to: 'k-s' }, 'to'],
    ['a rename from', RenameParameter, { from: 'k-s', to: 'key' }, 'from'],
    ['a delete of', DeleteParameter, { name: 'k-s' }, 'name'],
  ])(
    'refuses %s an invalid name with input-invalid, at that field',
    async (_role, command, input, expectedField) => {
      const store = await arrange()

      const result = store.run(command, input)

      expectErr(result)
      expect(result.error).toMatchObject({
        kind: 'input-invalid',
        command: command.id,
        issues: [{ path: [expectedField] }],
      })
    },
  )
})
