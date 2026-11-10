import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { addNode, deleteNode, duplicateNode } from '@keeb-cad/model/main'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import {
  aChainGroup,
  aDelta,
  aDesign,
  aLayout,
  anId,
  anOffset,
  aPartRef,
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { AddGroup } from './add-group'
import { AddSlot } from './add-slot'
import { DeleteNode } from './delete-node'
import { DuplicateNode } from './duplicate-node'
import { layoutCommandsModule } from './layout-commands-module'

function aLayoutDesign() {
  return aDesign({
    layout: aLayout({
      id: anId('root'),
      children: [aChainGroup({ id: anId('column'), children: [aSlot({ id: anId('home') })] })],
    }),
  })
}

const offset = anOffset({ position: aVec2({ x: aDelta('2mm') }) })

describe('the layout commands forward to their operation', () => {
  it.each([
    [
      'AddSlot',
      () => {
        const draft = aLayoutDesign()
        const input = {
          parent: anId('column'),
          index: 0,
          id: anId('top'),
          part: aPartRef('key'),
          inputs: { size: '1u' },
          offset,
        }
        return [new AddSlot().apply(draft, input), draft]
      },
      () => {
        const draft = aLayoutDesign()
        const node = { id: anId('top'), part: aPartRef('key'), inputs: { size: '1u' }, offset }
        return [addNode(draft, node, { parent: anId('column'), index: 0 }), draft]
      },
    ],
    [
      'AddGroup',
      () => {
        const draft = aLayoutDesign()
        const input = {
          arrangement: 'chain' as const,
          axis: 'y' as const,
          parent: anId('column'),
          index: 1,
          id: anId('inner'),
          defaultPart: aPartRef('key'),
          offset,
        }
        return [new AddGroup().apply(draft, input), draft]
      },
      () => {
        const draft = aLayoutDesign()
        const node = {
          arrangement: 'chain' as const,
          axis: 'y' as const,
          id: anId('inner'),
          defaultPart: aPartRef('key'),
          offset,
          children: [],
        }
        return [addNode(draft, node, { parent: anId('column'), index: 1 }), draft]
      },
    ],
    [
      'DuplicateNode',
      () => {
        const draft = aLayoutDesign()
        return [new DuplicateNode().apply(draft, { id: anId('home') }), draft]
      },
      () => {
        const draft = aLayoutDesign()
        return [duplicateNode(draft, anId('home')), draft]
      },
    ],
    [
      'DeleteNode',
      () => {
        const draft = aLayoutDesign()
        return [new DeleteNode().apply(draft, { ids: [anId('home')] }), draft]
      },
      () => {
        const draft = aLayoutDesign()
        return [deleteNode(draft, [anId('home')]), draft]
      },
    ],
  ])(
    '%s returns what its operation returns and leaves the same draft',
    (_name, viaCommand, viaOperation) => {
      expect(viaCommand()).toEqual(viaOperation())
    },
  )
})

describe('the layout input schemas', () => {
  it.each([
    [
      'AddSlot',
      AddSlot.input,
      {
        parent: 'column',
        index: 0,
        id: 'top',
        part: 'key',
        inputs: { size: '1u' },
        offset: { position: { x: '2mm', y: '0mm' } },
      },
    ],
    [
      'AddGroup, chain',
      AddGroup.input,
      {
        arrangement: 'chain',
        axis: 'x',
        parent: 'column',
        index: 0,
        id: 'g',
        defaultPart: 'key',
        offset: { rotation: '5deg' },
      },
    ],
    ['AddGroup, free', AddGroup.input, { arrangement: 'free', id: 'g' }],
    ['DuplicateNode', DuplicateNode.input, { id: 'home' }],
    ['DeleteNode', DeleteNode.input, { ids: ['home', 'column'] }],
  ])('%s parses its fields', (_name, schema, input) => {
    expect(v.parse(schema as v.GenericSchema, input)).toEqual(input)
  })

  it.each([
    ['a chain group with no axis', AddGroup.input, { arrangement: 'chain' }, [['axis']]],
    ['a fraction for an index', AddSlot.input, { index: 0.5 }, [['index']]],
  ])('refuses %s at its field', (_role, schema, input, expectedPaths) => {
    const result = v.safeParse(schema as v.GenericSchema, input)

    expect(
      (result.issues ?? []).map((issue) => (issue.path ?? []).map((item) => item.key)),
    ).toEqual(expectedPaths)
  })
})

describe('AddSlot through the store', () => {
  async function arrange() {
    const container = new Container().addModule(designModule).addModule(layoutCommandsModule)
    await container.autoLoad()
    const store = container.resolve(DesignStore)
    expectOk(store.replaceDesign({ design: aLayoutDesign(), unreadable: [] }))
    return store
  }

  it('refuses an index of −1 with input-invalid at the index', async () => {
    const store = await arrange()

    const result = store.run(AddSlot, { index: -1 })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'input-invalid', issues: [{ path: ['index'] }] })
  })

  it('takes an index of 0', async () => {
    const store = await arrange()

    expectOk(store.run(AddSlot, { index: 0, id: 'first' }))

    expect(store.current.getOrUndefined()?.design.layout.children.at(0)).toEqual({ id: 'first' })
  })
})
