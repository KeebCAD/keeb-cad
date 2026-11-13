import { DesignStore, designModule } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import {
  addNode,
  checkAddNode,
  checkDeleteNode,
  checkDuplicateNode,
  checkSetAnchor,
  deleteNode,
  duplicateNode,
  setAnchor,
} from '@keeb-cad/model/main'
import type { Result } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import {
  aChainGroup,
  aDelta,
  aDesign,
  aLayout,
  anId,
  anOffset,
  aPartRef,
  aGroupAnchor,
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import type { Rejection } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { AddGroup } from './add-group'
import { AddSlot } from './add-slot'
import { DeleteNode } from './delete-node'
import { DuplicateNode } from './duplicate-node'
import { SetAnchor } from './set-anchor'
import { settled } from '../testing/settled'
import { layoutCommandsModule } from './layout-commands-module'

function aLayoutDesign() {
  return aDesign({
    layout: aLayout({
      id: anId('root'),
      children: [
        aChainGroup({ id: anId('column'), children: [aSlot({ id: anId('home') })] }),
        aSlot({ id: anId('thumb'), anchor: aGroupAnchor({ ref: anId('column') }) }),
      ],
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
      'SetAnchor, an anchor',
      () => {
        const draft = aLayoutDesign()
        const anchor = aGroupAnchor({ ref: anId('root') })
        return [new SetAnchor().apply(draft, { id: anId('thumb'), anchor }), draft]
      },
      () => {
        const draft = aLayoutDesign()
        return [setAnchor(draft, anId('thumb'), aGroupAnchor({ ref: anId('root') })), draft]
      },
    ],
    [
      'SetAnchor, no anchor',
      () => {
        const draft = aLayoutDesign()
        return [new SetAnchor().apply(draft, { id: anId('thumb') }), draft]
      },
      () => {
        const draft = aLayoutDesign()
        return [setAnchor(draft, anId('thumb'), undefined), draft]
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

describe('the layout commands answer availability with their check', () => {
  it.each([
    [
      'AddSlot, a new id',
      () => {
        const design = aLayoutDesign()
        const input = { parent: anId('column'), index: 0, id: anId('top') }
        return [
          new AddSlot().available(design, input),
          checkAddNode(design, anId('top'), { parent: anId('column'), index: 0 }),
        ]
      },
    ],
    [
      'AddSlot, a taken id',
      () => {
        const design = aLayoutDesign()
        const input = { parent: anId('column'), index: 0, id: anId('home') }
        return [
          new AddSlot().available(design, input),
          checkAddNode(design, anId('home'), { parent: anId('column'), index: 0 }),
        ]
      },
    ],
    [
      'AddSlot, an index above the child count',
      () => {
        const design = aLayoutDesign()
        const input = { parent: anId('column'), index: 2 }
        return [
          new AddSlot().available(design, input),
          checkAddNode(design, undefined, { parent: anId('column'), index: 2 }),
        ]
      },
    ],
    [
      'AddGroup, a new id',
      () => {
        const design = aLayoutDesign()
        const input = {
          arrangement: 'free' as const,
          parent: anId('column'),
          index: 0,
          id: anId('inner'),
        }
        return [
          new AddGroup().available(design, input),
          checkAddNode(design, anId('inner'), { parent: anId('column'), index: 0 }),
        ]
      },
    ],
    [
      'AddGroup, a taken id',
      () => {
        const design = aLayoutDesign()
        const input = {
          arrangement: 'free' as const,
          parent: anId('column'),
          index: 0,
          id: anId('home'),
        }
        return [
          new AddGroup().available(design, input),
          checkAddNode(design, anId('home'), { parent: anId('column'), index: 0 }),
        ]
      },
    ],
    [
      'AddGroup, an index above the child count',
      () => {
        const design = aLayoutDesign()
        const input = { arrangement: 'free' as const, parent: anId('column'), index: 2 }
        return [
          new AddGroup().available(design, input),
          checkAddNode(design, undefined, { parent: anId('column'), index: 2 }),
        ]
      },
    ],
    [
      'DuplicateNode, an id the design has',
      () => {
        const design = aLayoutDesign()
        return [
          new DuplicateNode().available(design, { id: anId('home') }),
          checkDuplicateNode(design, anId('home')),
        ]
      },
    ],
    [
      'DuplicateNode, a missing id',
      () => {
        const design = aLayoutDesign()
        return [
          new DuplicateNode().available(design, { id: anId('missing') }),
          checkDuplicateNode(design, anId('missing')),
        ]
      },
    ],
    [
      'SetAnchor, a target the design has',
      () => {
        const design = aLayoutDesign()
        const anchor = aGroupAnchor({ ref: anId('root') })
        return [
          new SetAnchor().available(design, { id: anId('thumb'), anchor }),
          checkSetAnchor(design, anId('thumb'), anchor),
        ]
      },
    ],
    [
      'SetAnchor, a chain child',
      () => {
        const design = aLayoutDesign()
        const anchor = aGroupAnchor({ ref: anId('root') })
        return [
          new SetAnchor().available(design, { id: anId('home'), anchor }),
          checkSetAnchor(design, anId('home'), anchor),
        ]
      },
    ],
    [
      'DeleteNode, an id the design has',
      () => {
        const design = aLayoutDesign()
        const ids = [anId('home')]
        return [new DeleteNode().available(design, { ids }), checkDeleteNode(design, ids)]
      },
    ],
    [
      'DeleteNode, a missing id',
      () => {
        const design = aLayoutDesign()
        const ids = [anId('home'), anId('missing')]
        return [new DeleteNode().available(design, { ids }), checkDeleteNode(design, ids)]
      },
    ],
  ] satisfies [string, () => readonly [Result<void, Rejection>, Result<void, Rejection>]][])(
    '%s gives what its check gives',
    (_name, results) => {
      const [viaCommand, viaCheck] = results()

      expect(settled(viaCommand)).toEqual(settled(viaCheck))
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
    [
      'SetAnchor',
      SetAnchor.input,
      { id: 'thumb', anchor: { type: 'slot', ref: 'home', attach: 'edge-top' } },
    ],
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

describe('DeleteNode run by id', () => {
  it('refuses the root with root-required, committing nothing', async () => {
    const container = new Container().addModule(designModule).addModule(layoutCommandsModule)
    await container.autoLoad()
    const store = container.resolve(DesignStore)
    expectOk(store.replaceDesign({ design: aLayoutDesign(), unreadable: [] }))
    const before = store.current.getOrUndefined()

    const result = store.runById('layout.deleteNode', { ids: ['root'] })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'root-required', ids: ['root'] })
    expect(store.current.getOrUndefined()).toBe(before)
  })
})
