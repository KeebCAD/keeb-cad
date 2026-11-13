import { NewDesign } from '@keeb-cad/commands'
import { type Committed, DesignStore } from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { unsupportedFormMessage } from '@keeb-cad/model/worker'
import { corneyIslandLayout } from '@keeb-cad/reference-designs/scripts'
import { Option } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import type { LayoutOutput } from '@keeb-cad/schema'
import {
  aDesign,
  aLayout,
  aMeta,
  anId,
  aSlot,
  aSplitForm,
  aUnibodyForm,
} from '@keeb-cad/schema/testing'
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'

import { mainModules } from './main-modules'

const DIGITS = 9
const LEFT = 'left/'
const RIGHT = 'right/'
const EXPECTED_RIGHT_HALF_X = 140
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

// One side's posted rows in id order, the side prefix dropped from each id.
function sideOf(lifecycle: ModelWorkerLifecycle, prefix: string) {
  const ids = lifecycle.layout.map(({ output }) => output.ids).getOr([])
  return ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => ({ id: id.slice(prefix.length), row: lifecycle.layoutRow(id) }))
}

function seqs(lifecycle: ModelWorkerLifecycle) {
  return {
    parts: lifecycle.parts.map(({ seq }) => seq),
    layout: lifecycle.layout.map(({ seq }) => seq),
  }
}

// Center sits at the origin unturned, so its y-axis is the world's: (x, y, rot) goes to
// (−x, y, −rot) in (−180, 180], mirrored.
function reflected({ frame, anchorAt, ...fields }: LayoutOutput['rows'][number]) {
  return {
    ...fields,
    frame: {
      x: expect.closeTo(-frame.x, DIGITS),
      y: expect.closeTo(frame.y, DIGITS),
      rot: expect.closeTo(frame.rot === 180 ? 180 : -frame.rot, DIGITS),
      mirrored: true,
    },
    anchorAt: { x: expect.closeTo(-anchorAt.x, DIGITS), y: expect.closeTo(anchorAt.y, DIGITS) },
  }
}

describe('the right half on main', () => {
  it("posts every right row of Corney's script as its left row reflected across center's y-axis", async () => {
    const { store, lifecycle } = await arrange()

    await runCorneyScript(store)
    await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)
    const { seq } = committed(store)
    await expect.poll(() => lifecycle.issues.map((issues) => issues.seq)).toEqual(Option.some(seq))

    const left = sideOf(lifecycle, LEFT)
    expect(sideOf(lifecycle, RIGHT)).toEqual(
      left.map(({ id, row }) => ({ id, row: row.map(reflected) })),
    )
    expect(lifecycle.layoutRow(`${RIGHT}left-half`).map(({ frame }) => frame)).toEqual(
      Option.some({
        x: expect.closeTo(EXPECTED_RIGHT_HALF_X, DIGITS),
        y: expect.closeTo(0, DIGITS),
        rot: expect.closeTo(0, DIGITS),
        mirrored: true,
      }),
    )
    expect(lifecycle.issues.map(({ violations }) => violations)).toEqual(Option.some([]))
  })

  it.each([
    ['unibody', aUnibodyForm()],
    ['split with board mirrored', aSplitForm({ board: 'mirrored' })],
  ])(
    'posts only unsupported-form, naming the design, and zero rows for %s',
    async (_role, form) => {
      const { store, lifecycle } = await arrange()
      const design = anId('d')

      expectOk(
        store.replaceDesign({
          design: aDesign({
            meta: aMeta({ id: design, form }),
            layout: aLayout({ children: [aSlot({ id: anId('slot') })] }),
          }),
          unreadable: [],
        }),
      )
      await expect.poll(() => lifecycle.layoutSetArrived, FIRST_LOAD).toBe(true)
      const { seq } = committed(store)
      await expect
        .poll(() => lifecycle.issues.map((issues) => issues.seq))
        .toEqual(Option.some(seq))

      expect({
        violations: lifecycle.issues.map(({ violations }) => violations),
        seqs: seqs(lifecycle),
        parts: lifecycle.parts.map(({ output }) => [output.ids, output.w.length]),
        layout: lifecycle.layout.map(({ output }) => [output.ids, output.x.length]),
      }).toEqual({
        violations: Option.some([
          {
            kind: 'unsupported-form',
            severity: 'error',
            ids: [design],
            message: unsupportedFormMessage([design]),
            fixes: [],
          },
        ]),
        seqs: { parts: Option.some(seq), layout: Option.some(seq) },
        parts: Option.some([[], 0]),
        layout: Option.some([[], 0]),
      })
    },
  )
})
