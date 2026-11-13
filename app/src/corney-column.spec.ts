import { argumentHash, blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { NewDesign } from '@keeb-cad/commands'
import { type Committed, DesignStore } from '@keeb-cad/design'
import { DesignMirror, DesignMirrorWriter, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { createDerivations } from '@keeb-cad/model/worker'
import { corneyIslandLayout } from '@keeb-cad/reference-designs/scripts'
import { expectOk } from '@keeb-cad/result/testing'
import { compareId, type LayoutOutput } from '@keeb-cad/schema'
import { readBundle, writeBundle } from '@keeb-cad/storage'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { describe, expect, it } from 'vitest'

import { mainModules } from './main-modules'

async function arrangeStore(): Promise<DesignStore> {
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container.override(storageBackend).useValue(new MemoryBackend())
  await container.autoLoad()
  return container.resolve(DesignStore)
}

// The model worker's parts lane and placements, wired by hand on a mirror fed the store's design.
async function arrangePlacements() {
  const container = new Container().addModule(designWorkerModule).addModule(blueprintWorkerModule)
  await container.autoLoad()
  const runner = container.resolve(LaneRunner)
  runner.useLibrary(libraryData)
  const derivations = createDerivations(container.resolve(DesignMirror), libraryData, runner)
  const writer = container.resolve(DesignMirrorWriter)
  return async ({ design, revision }: Committed) => {
    writer.replace(design, revision)
    await runner.pause(derivations.pins.value)
    return { placements: derivations.placements.value, parts: derivations.parts.value }
  }
}

function committed(store: DesignStore): Committed {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value
}

async function runCorneyScript(store: DesignStore): Promise<void> {
  expectOk(await store.run(NewDesign, {}))
  for (const { command, input } of corneyIslandLayout) expectOk(store.runById(command, input))
}

// The script's left-half offset, and the 1u keycap plus the 1 mm gap a y chain steps by.
const EXPECTED_HALF_X = -140
const EXPECTED_ROW_STEP = 19
const EXPECTED_NODE_IDS = [
  'left-half',
  'matrix',
  'matrix-outer',
  'matrix-outer-bottom',
  'matrix-outer-home',
  'matrix-outer-top',
  'matrix-pinky',
  'matrix-pinky-bottom',
  'matrix-pinky-home',
  'matrix-pinky-top',
  'matrix-ring',
  'matrix-ring-bottom',
  'matrix-ring-home',
  'matrix-ring-top',
  'matrix-middle',
  'matrix-middle-bottom',
  'matrix-middle-home',
  'matrix-middle-top',
  'matrix-index',
  'matrix-index-bottom',
  'matrix-index-home',
  'matrix-index-top',
  'matrix-inner',
  'matrix-inner-bottom',
  'matrix-inner-home',
  'matrix-inner-top',
  'thumbfan',
  'thumbfan-near-home',
  'thumbfan-mid-home',
  'thumbfan-far-home',
]
const OUTER_COLUMN = ['matrix-outer-bottom', 'matrix-outer-home', 'matrix-outer-top']

const KEY_1U_RUN = `key@${argumentHash({ size: '1u' })}`

const slotAt = (x: number, y: number, part: number) => ({
  kind: 'slot',
  frame: { x, y, rot: 0, mirrored: false },
  anchorAt: { x, y },
  part,
  fit: 'fitted',
  placed: true,
})

function rowOf(placements: LayoutOutput, id: string) {
  return placements.rows[placements.ids.indexOf(`left/${id}`)]
}

describe("Corney Island's outer column", () => {
  it("steps the outer column's keys up one row at a time from the left half's origin", async () => {
    const store = await arrangeStore()
    const placementsOf = await arrangePlacements()

    await runCorneyScript(store)
    const { placements, parts } = await placementsOf(committed(store))

    const part = parts.output.ids.indexOf(KEY_1U_RUN)
    expect(OUTER_COLUMN.map((id) => rowOf(placements, id))).toEqual([
      slotAt(EXPECTED_HALF_X, 0, part),
      slotAt(EXPECTED_HALF_X, EXPECTED_ROW_STEP, part),
      slotAt(EXPECTED_HALF_X, 2 * EXPECTED_ROW_STEP, part),
    ])
  })

  it('places every node the same after the design is written to a bundle, read back and replaced', async () => {
    const store = await arrangeStore()
    const placementsOf = await arrangePlacements()
    await runCorneyScript(store)
    const { placements: before } = await placementsOf(committed(store))
    const root = committed(store).design.layout.id
    expect(before.ids).toEqual(
      [root, ...EXPECTED_NODE_IDS].map((id) => `left/${id}`).toSorted(compareId),
    )

    const read = readBundle(writeBundle(committed(store)))
    expectOk(read)
    expectOk(store.replaceDesign(read.value))

    expect((await placementsOf(committed(store))).placements).toEqual(before)
  })
})
