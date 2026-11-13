import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { AddSlot, DeleteNode, NewDesign, SetAnchor } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { DesignMirror, DesignMirrorWriter, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { createDerivations, dependencyCycleMessage, type Derivations } from '@keeb-cad/model/worker'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import {
  aDesign,
  aFreeGroup,
  aLayout,
  anAttachPoint,
  anId,
  aRevision,
  aSlot,
  aSlotAnchor,
} from '@keeb-cad/schema/testing'
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

// The model worker's derivations, wired by hand on a mirror holding the design.
async function arrangeDerivations(design: Design): Promise<Derivations> {
  const container = new Container().addModule(designWorkerModule).addModule(blueprintWorkerModule)
  await container.autoLoad()
  const runner = container.resolve(LaneRunner)
  runner.useLibrary(libraryData)
  const derivations = createDerivations(container.resolve(DesignMirror), libraryData, runner)
  container.resolve(DesignMirrorWriter).replace(design, aRevision())
  await runner.pause(derivations.pins.value)
  return derivations
}

function designOf(store: DesignStore) {
  return store.current.getOrUndefined()?.design
}

const slot = (id: string, anchoredTo?: string) =>
  aSlot({
    id: anId(id),
    ...(anchoredTo === undefined ? {} : { anchor: aSlotAnchor({ ref: anId(anchoredTo) }) }),
  })

const cycleRejection = (...ids: string[]) => ({
  kind: 'dependency-cycle',
  ids,
  message: dependencyCycleMessage(ids.map((id) => anId(id))),
})

// a and b anchored to each other, as only a loaded file can hold them.
const looped = () => aDesign({ layout: aLayout({ children: [slot('a', 'b'), slot('b', 'a')] }) })

describe('anchors through mainModules', () => {
  it('commits SetAnchor on a slot added after NewDesign', async () => {
    const store = await arrangeStore()
    expectOk(await store.run(NewDesign, {}))
    expectOk(store.run(AddSlot, { id: 'a' }))
    expectOk(store.run(AddSlot, { id: 'b' }))
    const anchor = aSlotAnchor({ ref: anId('a'), attach: anAttachPoint('edge-top') })

    expectOk(store.run(SetAnchor, { id: 'b', anchor }))

    expect(designOf(store)?.layout.children).toEqual([{ id: 'a' }, { id: 'b', anchor }])
  })

  it('refuses SetAnchor closing a loop with dependency-cycle, and availability says the same', async () => {
    const store = await arrangeStore()
    expectOk(
      store.replaceDesign({
        design: aDesign({ layout: aLayout({ children: [slot('a'), slot('b', 'a')] }) }),
        unreadable: [],
      }),
    )
    const before = designOf(store)
    const input = { id: 'a', anchor: aSlotAnchor({ ref: anId('b') }) }

    const result = store.run(SetAnchor, input)
    const available = store.available(SetAnchor, input)

    expectErr(result)
    expectErr(available)
    expect({ result: result.error, available: available.error, design: designOf(store) }).toEqual({
      result: cycleRejection('a', 'b'),
      available: cycleRejection('a', 'b'),
      design: before,
    })
  })

  it('refuses DeleteNode whose fallback closes a loop with dependency-cycle, the design unchanged', async () => {
    const store = await arrangeStore()
    const design = aDesign({
      layout: aLayout({
        children: [
          slot('m'),
          aFreeGroup({
            id: anId('p'),
            anchor: aSlotAnchor({ ref: anId('z') }),
            children: [slot('z', 'm')],
          }),
        ],
      }),
    })
    expectOk(store.replaceDesign({ design, unreadable: [] }))
    const before = designOf(store)

    const result = store.run(DeleteNode, { ids: ['m'] })

    expectErr(result)
    expect({ rejection: result.error, design: designOf(store) }).toEqual({
      rejection: cycleRejection('z', 'p'),
      design: before,
    })
  })

  it('commits an edit elsewhere in a design loaded with a loop', async () => {
    const store = await arrangeStore()
    expectOk(store.replaceDesign({ design: looped(), unreadable: [] }))

    expectOk(store.run(AddSlot, { id: 'c' }))

    expect(designOf(store)?.layout.children.map(({ id }) => id)).toEqual(['a', 'b', 'c'])
  })
})

describe('a loaded loop in the model worker', () => {
  it('reports dependency-cycle and leaves its members unplaced', async () => {
    const { violations, placements } = await arrangeDerivations(looped())

    const unplaced = {
      kind: 'slot',
      frame: { x: NaN, y: NaN, rot: NaN, mirrored: false },
      anchorAt: { x: NaN, y: NaN },
      part: 0,
      fit: 'fitted',
      placed: false,
    }
    const rowOf = (id: string) => placements.value.rows[placements.value.ids.indexOf(`left/${id}`)]
    const cycle = [anId('a'), anId('b')]
    expect({ violations: violations.value, rows: [rowOf('a'), rowOf('b')] }).toEqual({
      violations: [
        {
          kind: 'dependency-cycle',
          severity: 'error',
          ids: cycle,
          message: dependencyCycleMessage(cycle),
          fixes: [],
        },
      ],
      rows: [unplaced, unplaced],
    })
  })
})
