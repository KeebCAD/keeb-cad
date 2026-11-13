import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { NewDesign } from '@keeb-cad/commands'
import { type Committed, DesignStore } from '@keeb-cad/design'
import { DesignMirror, DesignMirrorWriter, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { createDerivations } from '@keeb-cad/model/worker'
import pointsYaml from '@keeb-cad/reference-designs/ergogen/points/points.yaml?raw'
import unitsYaml from '@keeb-cad/reference-designs/ergogen/points/units.yaml?raw'
import { compareKeyPoses, keyPosesFrom } from '@keeb-cad/reference-designs/key-centres'
import { corneyIslandLayout } from '@keeb-cad/reference-designs/scripts'
import { expectOk } from '@keeb-cad/result/testing'
import type { Frozen, LayoutOutput, Node } from '@keeb-cad/schema'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { describe, expect, it } from 'vitest'

import { mainModules } from './main-modules'

// Ergogen's matrix anchor shift, source/config.yaml's `shift: [100, -100]`.
const ERGOGEN_SHIFT = { x: 100, y: -100 }
const LEFT_HALF = 'left-half'

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
  return async ({ design, revision }: Committed): Promise<LayoutOutput> => {
    writer.replace(design, revision)
    await runner.pause(derivations.pins.value)
    return derivations.placements.value
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

// Each placed slot as an Ergogen pose, relative to the left half's origin.
function keyPosesOf(placements: LayoutOutput) {
  const half = placements.rows[placements.ids.indexOf(`left/${LEFT_HALF}`)]?.frame
  if (half === undefined) throw new Error(`No row for ${LEFT_HALF}.`)
  return placements.ids.flatMap((id, row) => {
    const { kind, frame } = placements.rows[row] ?? {}
    if (!id.startsWith('left/') || kind !== 'slot' || frame === undefined) return []
    const name = id.slice('left/'.length).replaceAll('-', '_')
    return [{ name, x: frame.x - half.x, y: frame.y - half.y, r: frame.rot }]
  })
}

function ergogenKeyPoses() {
  return keyPosesFrom(pointsYaml, unitsYaml).map((pose) => ({
    ...pose,
    x: pose.x - ERGOGEN_SHIFT.x,
    y: pose.y - ERGOGEN_SHIFT.y,
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
    const store = await arrangeStore()
    const placementsOf = await arrangePlacements()

    await runCorneyScript(store)
    const placements = await placementsOf(committed(store))

    const { keys, missing, extra, duplicate } = compareKeyPoses(
      ergogenKeyPoses(),
      keyPosesOf(placements),
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
    const store = await arrangeStore()

    await runCorneyScript(store)

    expect(onTheRootWithPosition(committed(store).design.layout.children)).toEqual([LEFT_HALF])
  })
})
