import { RenameParameter, SetParameter } from '@keeb-cad/commands'
import type { DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Design, LayoutOutput, Parameter } from '@keeb-cad/schema'
import {
  aDelta,
  aDesign,
  aGap,
  aLayout,
  aLength,
  aMeta,
  anExpression,
  anId,
  anOffset,
  aParameter,
  aParameterName,
  aSlot,
  aVec2,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { arrangePlacements } from './testing/arrange-placements'
import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'
import { runCorneyScript } from './testing/run-corney-script'

// The home key of each column in Corney's x chain, in chain order.
const HOME_KEYS = ['outer', 'pinky', 'ring', 'middle', 'index', 'inner'].map(
  (column) => `left/matrix-${column}-home`,
)
// A 1 mm wider gap moves each column 1 mm further per step from the first.
const EXPECTED_SHIFTS = [0, 1, 2, 3, 4, 5]
const DIGITS = 9

function xOf(placements: LayoutOutput, id: string): number {
  return placements.rows[placements.ids.indexOf(id)]?.frame.x ?? NaN
}

describe('a parameter driving placement', () => {
  it("moves each step of Corney's x chain 1 mm further when the gap's parameter grows by 1 mm, and one undo restores it", async () => {
    const store = await arrangeStore(new Container())
    const derivationsOf = await arrangePlacements(new Container())
    await runCorneyScript(store)
    const { design } = committed(store)
    expectOk(
      store.replaceDesign({
        design: {
          ...design,
          meta: { ...design.meta, gap: { ...design.meta.gap, x: aLength('wall') } },
          parameters: [aParameter({ name: aParameterName('wall'), value: anExpression('1mm') })],
        },
        unreadable: [],
      }),
    )
    const arranged = structuredClone((await derivationsOf(committed(store))).placements.value)

    expectOk(store.run(SetParameter, { name: 'wall', value: '2mm' }))
    const changed = structuredClone((await derivationsOf(committed(store))).placements.value)
    expectOk(store.undo())
    const undone = (await derivationsOf(committed(store))).placements.value

    expect({
      shifts: HOME_KEYS.map((id) => xOf(changed, id) - xOf(arranged, id)),
      undone,
    }).toEqual({
      shifts: EXPECTED_SHIFTS.map((shift) => expect.closeTo(shift, DIGITS)),
      undone: arranged,
    })
  })

  it('commits parameters.setParameter run by its id', async () => {
    const store = await arrangeStore(new Container())
    await runCorneyScript(store)

    expectOk(store.runById('parameters.setParameter', { name: 'wall', value: '3mm' }))
    expect(committed(store).design.parameters).toEqual([
      aParameter({ name: aParameterName('wall'), value: anExpression('3mm') }),
    ])
  })
})

const parameter = (name: string, value: string) =>
  aParameter({ name: aParameterName(name), value: anExpression(value) })

async function arrangeDesign(design: Design): Promise<DesignStore> {
  const store = await arrangeStore(new Container())
  expectOk(store.replaceDesign({ design, unreadable: [] }))
  return store
}

function readingAll(name: string) {
  return aDesign({
    meta: aMeta({ gap: aGap({ x: aLength(name) }) }),
    parameters: [parameter(name, '19mm'), parameter('b', `${name} + 1mm`)],
    layout: aLayout({
      children: [
        aSlot({ id: anId('k'), offset: anOffset({ position: aVec2({ x: aDelta(name) }) }) }),
      ],
    }),
  })
}

describe('renaming and deleting a parameter', () => {
  it('rewrites every use of the name in one command, and one undo restores the arranged design', async () => {
    const arranged = readingAll('ks')
    const store = await arrangeDesign(arranged)

    expectOk(store.run(RenameParameter, { from: 'ks', to: 'key' }))
    const renamed = committed(store).design
    expectOk(store.undo())

    expect({ renamed, undone: committed(store).design }).toEqual({
      renamed: readingAll('key'),
      undone: arranged,
    })
  })

  it('commits nothing for a rename to its own name, leaving nothing to undo', async () => {
    const store = await arrangeDesign(readingAll('ks'))
    const before = committed(store)

    const result = store.run(RenameParameter, { from: 'ks', to: 'ks' })

    expectOk(result)
    expect(committed(store)).toBe(before)
    expectErr(store.undo())
  })

  it('commits deleteParameter as one undo step that restores the parameter at its place', async () => {
    const parameters: Parameter[] = [
      parameter('a', '1mm'),
      parameter('ks', '19mm'),
      parameter('b', '2mm'),
    ]
    const store = await arrangeDesign(aDesign({ parameters }))

    expectOk(store.runById('parameters.deleteParameter', { name: 'ks' }))
    const deleted = committed(store).design.parameters
    expectOk(store.undo())

    expect({ deleted, undone: committed(store).design.parameters }).toEqual({
      deleted: [parameter('a', '1mm'), parameter('b', '2mm')],
      undone: parameters,
    })
  })

  it.each([
    ['parameters.renameParameter', { from: 'wall', to: 'w' }, [parameter('w', '1mm')]],
    ['parameters.deleteParameter', { name: 'wall' }, []],
  ])('commits %s run by its id', async (command, input, expectedParameters) => {
    const store = await arrangeDesign(aDesign({ parameters: [parameter('wall', '1mm')] }))

    expectOk(store.runById(command, input))
    expect(committed(store).design.parameters).toEqual(expectedParameters)
  })
})
