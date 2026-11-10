import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
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

const at = (y: number) => ({
  kind: 'slot',
  frame: { x: 0, y, rot: 0, mirrored: false },
  fit: 'fitted',
  placed: true,
})

describe("Corney Island's outer column", () => {
  it('places outer-bottom, outer-home and outer-top at y 0, 19 and 38 in the group outer', async () => {
    const store = await arrangeStore()
    const placementsOf = await arrangePlacements()

    await runCorneyScript(store)
    const placements = await placementsOf(committed(store))

    const rowOf = (id: string) => placements.rows[placements.ids.indexOf(`left/${id}`)]
    expect(committed(store).design.layout.children).toEqual([
      {
        id: 'outer',
        arrangement: 'chain',
        axis: 'y',
        children: [{ id: 'outer-bottom' }, { id: 'outer-home' }, { id: 'outer-top' }],
      },
    ])
    expect(['outer-bottom', 'outer-home', 'outer-top'].map(rowOf)).toEqual([
      expect.objectContaining(at(0)),
      expect.objectContaining(at(19)),
      expect.objectContaining(at(38)),
    ])
  })

  it('places the same after the design is written to a bundle, read back and replaced', async () => {
    const store = await arrangeStore()
    const placementsOf = await arrangePlacements()
    await runCorneyScript(store)
    const before = await placementsOf(committed(store))
    const root = committed(store).design.layout.id
    expect(before.ids).toEqual(
      [
        `left/${root}`,
        'left/outer',
        'left/outer-bottom',
        'left/outer-home',
        'left/outer-top',
      ].toSorted(compareId),
    )

    const read = readBundle(writeBundle(committed(store)))
    expectOk(read)
    expectOk(store.replaceDesign(read.value))

    expect(await placementsOf(committed(store))).toEqual(before)
  })
})
