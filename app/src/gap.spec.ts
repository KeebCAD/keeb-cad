import { SetGap } from '@keeb-cad/commands'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aGap, aLength, aMeta } from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { arrangePlacements } from './testing/arrange-placements'
import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'
import { expectXShifts } from './testing/expect-x-shifts'
import { runCorneyScript } from './testing/run-corney-script'

// A 1 mm wider gap moves each column 1 mm further per step from the first.
const EXPECTED_SHIFTS = [0, 1, 2, 3, 4, 5]

describe('setting the gap', () => {
  it("moves each step of Corney's x chain 1 mm further when gap x grows from 1 mm to 2 mm, and one undo restores it", async () => {
    const store = await arrangeStore(new Container())
    const derivationsOf = await arrangePlacements(new Container())
    await runCorneyScript(store)
    const arranged = structuredClone((await derivationsOf(committed(store))).placements.value)

    expectOk(store.run(SetGap, { x: '2mm' }))
    const changed = structuredClone((await derivationsOf(committed(store))).placements.value)
    expectOk(store.undo())
    const undone = (await derivationsOf(committed(store))).placements.value

    expectXShifts({ arranged, changed, undone, expectedShifts: EXPECTED_SHIFTS })
  })

  it("commits layout.setGap through main's modules", async () => {
    const store = await arrangeStore(new Container())
    expectOk(
      store.replaceDesign({
        design: aDesign({ meta: aMeta({ gap: aGap({ x: aLength('1mm'), y: aLength('1mm') }) }) }),
        unreadable: [],
      }),
    )

    expectOk(store.run(SetGap, { y: '3mm' }))

    expect(committed(store).design.meta.gap).toEqual(aGap({ x: aLength('1mm'), y: aLength('3mm') }))
  })
})
