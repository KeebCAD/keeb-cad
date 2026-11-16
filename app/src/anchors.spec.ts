import { AddSlot, DeleteNode, NewDesign, SetAnchor } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { dependencyCycleMessage, type Derivations } from '@keeb-cad/model/worker'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import {
  aDesign,
  aFingerprintsFile,
  aFreeGroup,
  aLayout,
  aLayoutRow,
  anAttachPoint,
  anId,
  aRevision,
  aRoutingFile,
  aSlot,
  aSlotAnchor,
} from '@keeb-cad/schema/testing'
import { describe, expect, it } from 'vitest'

import { arrangePlacements } from './testing/arrange-placements'
import { arrangeStore } from './testing/arrange-store'

// The model worker's derivations on a loaded design, which no command builds.
async function arrangeDerivations(design: Design): Promise<Derivations> {
  const place = await arrangePlacements(new Container())
  return place({
    design,
    routing: aRoutingFile(),
    fingerprints: aFingerprintsFile(),
    seq: 0,
    revision: aRevision(),
  })
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
    const store = await arrangeStore(new Container())
    expectOk(await store.run(NewDesign, {}))
    expectOk(store.run(AddSlot, { id: 'a' }))
    expectOk(store.run(AddSlot, { id: 'b' }))
    const anchor = aSlotAnchor({ ref: anId('a'), attach: anAttachPoint('edge-top') })

    expectOk(store.run(SetAnchor, { id: 'b', anchor }))

    expect(designOf(store)?.layout.children).toEqual([{ id: 'a' }, { id: 'b', anchor }])
  })

  it('refuses SetAnchor closing a loop with dependency-cycle, and availability says the same', async () => {
    const store = await arrangeStore(new Container())
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
    const store = await arrangeStore(new Container())
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
    const store = await arrangeStore(new Container())
    expectOk(store.replaceDesign({ design: looped(), unreadable: [] }))

    expectOk(store.run(AddSlot, { id: 'c' }))

    expect(designOf(store)?.layout.children.map(({ id }) => id)).toEqual(['a', 'b', 'c'])
  })
})

describe('a loaded loop in the model worker', () => {
  it('reports dependency-cycle and leaves its members unplaced', async () => {
    const { violations, placements } = await arrangeDerivations(looped())

    const unplaced = aLayoutRow({
      frame: { x: NaN, y: NaN, rot: NaN, mirrored: false },
      anchorAt: { x: NaN, y: NaN },
      placed: false,
    })
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
