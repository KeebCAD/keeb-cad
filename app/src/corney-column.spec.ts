import { argumentHash } from '@keeb-cad/blueprint/worker'
import { Container } from '@keeb-cad/di'
import { expectOk } from '@keeb-cad/result/testing'
import type { LayoutOutput } from '@keeb-cad/schema'
import { aLayoutRow } from '@keeb-cad/schema/testing'
import { readBundle, writeBundle } from '@keeb-cad/storage'
import { describe, expect, it } from 'vitest'

import { arrangePlacements } from './testing/arrange-placements'
import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'
import { runCorneyScript } from './testing/run-corney-script'

// The script's left-half offset, and the 1u keycap plus the 1 mm gap a y chain steps by.
const EXPECTED_HALF_X = -140
const EXPECTED_ROW_STEP = 19
// Every node of Corney's script on each side, the root aside, in code-unit order.
const EXPECTED_IDS = [
  'left/left-half',
  'left/matrix',
  'left/matrix-index',
  'left/matrix-index-bottom',
  'left/matrix-index-home',
  'left/matrix-index-top',
  'left/matrix-inner',
  'left/matrix-inner-bottom',
  'left/matrix-inner-home',
  'left/matrix-inner-top',
  'left/matrix-middle',
  'left/matrix-middle-bottom',
  'left/matrix-middle-home',
  'left/matrix-middle-top',
  'left/matrix-outer',
  'left/matrix-outer-bottom',
  'left/matrix-outer-home',
  'left/matrix-outer-top',
  'left/matrix-pinky',
  'left/matrix-pinky-bottom',
  'left/matrix-pinky-home',
  'left/matrix-pinky-top',
  'left/matrix-ring',
  'left/matrix-ring-bottom',
  'left/matrix-ring-home',
  'left/matrix-ring-top',
  'left/thumbfan',
  'left/thumbfan-far-home',
  'left/thumbfan-mid-home',
  'left/thumbfan-near-home',
  'right/left-half',
  'right/matrix',
  'right/matrix-index',
  'right/matrix-index-bottom',
  'right/matrix-index-home',
  'right/matrix-index-top',
  'right/matrix-inner',
  'right/matrix-inner-bottom',
  'right/matrix-inner-home',
  'right/matrix-inner-top',
  'right/matrix-middle',
  'right/matrix-middle-bottom',
  'right/matrix-middle-home',
  'right/matrix-middle-top',
  'right/matrix-outer',
  'right/matrix-outer-bottom',
  'right/matrix-outer-home',
  'right/matrix-outer-top',
  'right/matrix-pinky',
  'right/matrix-pinky-bottom',
  'right/matrix-pinky-home',
  'right/matrix-pinky-top',
  'right/matrix-ring',
  'right/matrix-ring-bottom',
  'right/matrix-ring-home',
  'right/matrix-ring-top',
  'right/thumbfan',
  'right/thumbfan-far-home',
  'right/thumbfan-mid-home',
  'right/thumbfan-near-home',
]
const OUTER_COLUMN = ['left/matrix-outer-bottom', 'left/matrix-outer-home', 'left/matrix-outer-top']

const KEY_1U_RUN = `key@${argumentHash({ size: '1u' })}`

const slotAt = (x: number, y: number, part: number) =>
  aLayoutRow({ frame: { x, y, rot: 0, mirrored: false }, anchorAt: { x, y }, part })

function rowOf(placements: LayoutOutput, id: string) {
  return placements.rows[placements.ids.indexOf(id)]
}

describe("Corney Island's outer column", () => {
  it("steps the outer column's keys up one row at a time from the left half's origin", async () => {
    const store = await arrangeStore(new Container())
    const derivationsOf = await arrangePlacements(new Container())

    await runCorneyScript(store)
    const { placements, parts } = await derivationsOf(committed(store))

    const part = parts.value.output.ids.indexOf(KEY_1U_RUN)
    expect(OUTER_COLUMN.map((id) => rowOf(placements.value, id))).toEqual([
      slotAt(EXPECTED_HALF_X, 0, part),
      slotAt(EXPECTED_HALF_X, EXPECTED_ROW_STEP, part),
      slotAt(EXPECTED_HALF_X, 2 * EXPECTED_ROW_STEP, part),
    ])
  })

  it('places every node the same after the design is written to a bundle, read back and replaced', async () => {
    const store = await arrangeStore(new Container())
    const derivationsOf = await arrangePlacements(new Container())
    await runCorneyScript(store)
    const before = (await derivationsOf(committed(store))).placements.value
    const roots = [
      `left/${committed(store).design.layout.id}`,
      `right/${committed(store).design.layout.id}`,
    ]
    expect({
      ids: before.ids.filter((id) => !roots.includes(id)),
      roots: before.ids.filter((id) => roots.includes(id)),
    }).toEqual({ ids: EXPECTED_IDS, roots })

    const read = readBundle(writeBundle(committed(store)))
    expectOk(read)
    expectOk(store.replaceDesign(read.value))

    expect((await derivationsOf(committed(store))).placements.value).toEqual(before)
  })
})
