import { SetParameter } from '@keeb-cad/commands'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import type { LayoutOutput } from '@keeb-cad/schema'
import { anExpression, aLength, aParameter, aParameterName } from '@keeb-cad/schema/testing'
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
