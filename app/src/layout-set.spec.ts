import { argumentHash } from '@keeb-cad/blueprint/worker'
import { NewDesign } from '@keeb-cad/commands'
import { type Committed, DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { corneyIslandLayout } from '@keeb-cad/reference-designs/scripts'
import { Option } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { aDesign, aLayout, aMeta, anId, aSlot, aUnibodyForm } from '@keeb-cad/schema/testing'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'

import { mainModules } from './main-modules'

const KEY_RUN = `key@${argumentHash({ size: '1u' })}`
const CORNEY_SLOTS = ['matrix-outer-bottom', 'matrix-outer-home', 'matrix-outer-top']
const GROUP_PART = -1
const THUMBFAN_KEYS = ['thumbfan-near-home', 'thumbfan-mid-home', 'thumbfan-far-home']
// The worker's first load has Vite transform its whole module graph on demand, which took over
// two seconds while the rest of the suite ran beside it.
const FIRST_LOAD = { timeout: 10_000 }

async function arrange() {
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container.override(storageBackend).useValue(new MemoryBackend())
  await container.autoLoad()
  const lifecycle = container.resolve(ModelWorkerLifecycle)
  lifecycle.start(() => {
    const worker = new Worker(new URL('model.worker.ts', import.meta.url), { type: 'module' })
    onTestFinished(() => worker.terminate())
    return worker
  })
  return { store: container.resolve(DesignStore), lifecycle }
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

// Each node's part as main reads it: a slot's names a row of the same post's parts ids.
function partsOf(lifecycle: ModelWorkerLifecycle, nodes: readonly string[]) {
  const partIds = lifecycle.parts.map(({ output }) => output.ids).getOr([])
  return Object.fromEntries(
    nodes.map((node) => [
      node,
      lifecycle
        .layoutRow(`left/${node}`)
        .map(({ kind, part }) => (kind === 'slot' ? partIds[part] : part)),
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
    const { store, lifecycle } = await arrange()

    await runCorneyScript(store)
    await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)

    const { seq, design } = committed(store)
    expect(seqs(lifecycle)).toEqual({ parts: Option.some(seq), layout: Option.some(seq) })
    expect(partsOf(lifecycle, [design.layout.id, 'matrix-outer', ...CORNEY_SLOTS])).toEqual({
      [design.layout.id]: Option.some(GROUP_PART),
      'matrix-outer': Option.some(GROUP_PART),
      'matrix-outer-bottom': Option.some(KEY_RUN),
      'matrix-outer-home': Option.some(KEY_RUN),
      'matrix-outer-top': Option.some(KEY_RUN),
    })
  })

  it('arrives with zero rows in both outputs for a unibody design with a slot', async () => {
    const { store, lifecycle } = await arrange()

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
      parts: lifecycle.parts.map(({ output }) => [output.ids, output.w.length]),
      layout: lifecycle.layout.map(({ output }) => [output.ids, output.x.length]),
    }).toEqual({
      seqs: { parts: Option.some(seq), layout: Option.some(seq) },
      parts: Option.some([[], 0]),
      layout: Option.some([[], 0]),
    })
  })

  it('arrives at the new seq after one more slot, every slot indexing its own post', async () => {
    const { store, lifecycle } = await arrange()
    await runCorneyScript(store)
    await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)

    expectOk(store.runById('layout.addSlot', { parent: 'matrix-outer', id: 'matrix-outer-extra' }))
    await expect.poll(() => lifecycle.layoutSetArrived).toBe(true)

    const { seq } = committed(store)
    expect(seqs(lifecycle)).toEqual({ parts: Option.some(seq), layout: Option.some(seq) })
    expect(partsOf(lifecycle, [...CORNEY_SLOTS, 'matrix-outer-extra'])).toEqual({
      'matrix-outer-bottom': Option.some(KEY_RUN),
      'matrix-outer-home': Option.some(KEY_RUN),
      'matrix-outer-top': Option.some(KEY_RUN),
      'matrix-outer-extra': Option.some(KEY_RUN),
    })
  })

  it("carries the thumbfan's border on each side, and none on its keys", async () => {
    const { store, lifecycle } = await arrange()

    await runCorneyScript(store)
    await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)

    const borderOf = (id: string) => lifecycle.layoutRow(id).map(({ border }) => border)
    const regionsOf = (id: string) => borderOf(id).map(({ length }) => length)
    expect({
      left: regionsOf('left/thumbfan'),
      right: regionsOf('right/thumbfan'),
      keys: THUMBFAN_KEYS.flatMap((key) => [borderOf(`left/${key}`), borderOf(`right/${key}`)]),
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
