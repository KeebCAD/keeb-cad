import { Container } from '@keeb-cad/di'
import pointsYaml from '@keeb-cad/reference-designs/ergogen/points/points.yaml?raw'
import unitsYaml from '@keeb-cad/reference-designs/ergogen/points/units.yaml?raw'
import { compareKeyFrames, keyFramesFrom } from '@keeb-cad/reference-designs/key-centres'
import type { Frozen, LayoutOutput, Node } from '@keeb-cad/schema'
import { describe, expect, it } from 'vitest'

import { arrangePlacements } from './testing/arrange-placements'
import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'
import { runCorneyScript } from './testing/run-corney-script'

// Ergogen's matrix anchor shift, source/config.yaml's `shift: [100, -100]`.
const ERGOGEN_SHIFT = { x: 100, y: -100 }
const LEFT_HALF = 'left-half'

// Each placed slot as an Ergogen key frame, relative to the left half's origin.
function keyFramesOf(placements: LayoutOutput) {
  const half = placements.rows[placements.ids.indexOf(`left/${LEFT_HALF}`)]?.frame
  if (half === undefined) throw new Error(`No row for ${LEFT_HALF}.`)
  return placements.ids.flatMap((id, row) => {
    const { kind, frame } = placements.rows[row] ?? {}
    if (!id.startsWith('left/') || kind !== 'slot' || frame === undefined) return []
    const name = id.slice('left/'.length).replaceAll('-', '_')
    return [{ name, x: frame.x - half.x, y: frame.y - half.y, r: frame.rot }]
  })
}

function ergogenKeyFrames() {
  return keyFramesFrom(pointsYaml, unitsYaml).map((frame) => ({
    ...frame,
    x: frame.x - ERGOGEN_SHIFT.x,
    y: frame.y - ERGOGEN_SHIFT.y,
  }))
}

// A root child with no anchor depends on the root itself.
function onTheRootWithPosition(children: Frozen<Node[]>): string[] {
  return children
    .filter((node) => node.anchor === undefined && node.offset?.position !== undefined)
    .map(({ id }) => id)
}

describe("Corney Island's left half from commands", () => {
  it("places every key on Ergogen's centre and rotation, none missing, extra or duplicate", async () => {
    const store = await arrangeStore(new Container())
    const derivationsOf = await arrangePlacements(new Container())

    await runCorneyScript(store)
    const placements = (await derivationsOf(committed(store))).placements.value

    const { keys, missing, extra, duplicate } = compareKeyFrames(
      ergogenKeyFrames(),
      keyFramesOf(placements),
    )
    // A failing key shows with its deviation.
    expect({ failing: keys.filter(({ pass }) => !pass), missing, extra, duplicate }).toEqual({
      failing: [],
      missing: [],
      extra: [],
      duplicate: [],
    })
  })

  it('gives an absolute position only to left-half, the one node depending on the root', async () => {
    const store = await arrangeStore(new Container())

    await runCorneyScript(store)

    expect(onTheRootWithPosition(committed(store).design.layout.children)).toEqual([LEFT_HALF])
  })
})
