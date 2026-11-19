import { argumentHash } from '@keeb-cad/blueprint/worker'
import { NewDesign } from '@keeb-cad/commands'
import { Container } from '@keeb-cad/di'
import { corneyIslandLayout } from '@keeb-cad/reference-designs/scripts'
import { Option } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayout, aMeta, anId, aSlot, aUnibodyForm } from '@keeb-cad/schema/testing'
import type { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { describe, expect, it } from 'vitest'

import { arrangeModelWorker } from './testing/arrange-model-worker'
import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'
import { runCorneyScript } from './testing/run-corney-script'

const KEY_RUN = `key@${argumentHash({ size: '1u' })}`
const CORNEY_SLOTS = ['left/matrix-outer-bottom', 'left/matrix-outer-home', 'left/matrix-outer-top']
const GROUP_PART = -1
const THUMBFAN_KEYS = [
  'left/thumbfan-near-home',
  'right/thumbfan-near-home',
  'left/thumbfan-mid-home',
  'right/thumbfan-mid-home',
  'left/thumbfan-far-home',
  'right/thumbfan-far-home',
]
// The worker's first load has Vite transform its whole module graph on demand, which took over
// two seconds while the rest of the suite ran beside it.
const FIRST_LOAD = { timeout: 10_000 }

// Each row's part as main reads it: a slot's names a row of the same post's parts ids.
function partsOf(lifecycle: ModelWorkerLifecycle, ids: readonly string[]) {
  const partIds = lifecycle.parts.map(({ output }) => output.ids).getOr([])
  return Object.fromEntries(
    ids.map((id) => [
      id,
      lifecycle.layoutRow(id).map(({ kind, part }) => (kind === 'slot' ? partIds[part] : part)),
    ]),
  )
}

function seqs(lifecycle: ModelWorkerLifecycle) {
  return {
    parts: lifecycle.parts.map(({ seq }) => seq),
    layout: lifecycle.layout.map(({ seq }) => seq),
  }
}

describe('the Layout set on main', () => {
  it("arrives at the latest seq after Corney's script, each slot naming its run", async () => {
    const { store, lifecycle } = await arrangeModelWorker(new Container())

    await runCorneyScript(store)
    await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)

    const { seq, design } = committed(store)
    const root = `left/${design.layout.id}`
    expect(seqs(lifecycle)).toEqual({ parts: Option.some(seq), layout: Option.some(seq) })
    expect(partsOf(lifecycle, [root, 'left/matrix-outer', ...CORNEY_SLOTS])).toEqual({
      [root]: Option.some(GROUP_PART),
      'left/matrix-outer': Option.some(GROUP_PART),
      'left/matrix-outer-bottom': Option.some(KEY_RUN),
      'left/matrix-outer-home': Option.some(KEY_RUN),
      'left/matrix-outer-top': Option.some(KEY_RUN),
    })
  })

  it('arrives with zero rows in both outputs for a unibody design with a slot', async () => {
    const { store, lifecycle } = await arrangeModelWorker(new Container())

    expectOk(
      store.replaceDesign({
        design: aDesign({
          meta: aMeta({ form: aUnibodyForm() }),
          layout: aLayout({ children: [aSlot({ id: anId('slot') })] }),
        }),
        unreadable: [],
      }),
    )
    await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)

    const { seq } = committed(store)
    expect({
      seqs: seqs(lifecycle),
      parts: lifecycle.parts.map(({ output }) => [output.ids, output.rowLoops.length - 1]),
      layout: lifecycle.layout.map(({ output }) => [output.ids, output.x.length]),
    }).toEqual({
      seqs: { parts: Option.some(seq), layout: Option.some(seq) },
      parts: Option.some([[], 0]),
      layout: Option.some([[], 0]),
    })
  })

  it('arrives at the new seq after one more slot, every slot indexing its own post', async () => {
    const { store, lifecycle } = await arrangeModelWorker(new Container())
    await runCorneyScript(store)
    await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)

    expectOk(store.runById('layout.addSlot', { parent: 'matrix-outer', id: 'matrix-outer-extra' }))
    await expect.poll(() => lifecycle.layoutSetArrived).toBe(true)

    const { seq } = committed(store)
    expect(seqs(lifecycle)).toEqual({ parts: Option.some(seq), layout: Option.some(seq) })
    expect(partsOf(lifecycle, [...CORNEY_SLOTS, 'left/matrix-outer-extra'])).toEqual({
      'left/matrix-outer-bottom': Option.some(KEY_RUN),
      'left/matrix-outer-home': Option.some(KEY_RUN),
      'left/matrix-outer-top': Option.some(KEY_RUN),
      'left/matrix-outer-extra': Option.some(KEY_RUN),
    })
  })

  it("carries the thumbfan's border on each side, and none on its keys", async () => {
    const { store, lifecycle } = await arrangeModelWorker(new Container())

    await runCorneyScript(store)
    await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)

    const borderOf = (id: string) => lifecycle.layoutRow(id).map(({ border }) => border)
    const regionsOf = (id: string) => borderOf(id).map(({ length }) => length)
    expect({
      left: regionsOf('left/thumbfan'),
      right: regionsOf('right/thumbfan'),
      keys: THUMBFAN_KEYS.map(borderOf),
    }).toEqual({
      left: Option.some(1),
      right: Option.some(1),
      keys: [
        Option.some([]),
        Option.some([]),
        Option.some([]),
        Option.some([]),
        Option.some([]),
        Option.some([]),
      ],
    })
  })
})

describe("Corney's script", () => {
  it.each(corneyIslandLayout.map((step, index) => [index, step.command, step] as const))(
    'accepts step %i, %s, after the steps before it',
    async (index, _command, { command, input }) => {
      const store = await arrangeStore(new Container())
      expectOk(await store.run(NewDesign, {}))
      for (const before of corneyIslandLayout.slice(0, index))
        store.runById(before.command, before.input)

      const result = store.runById(command, input)

      expectOk(result)
    },
  )
})
