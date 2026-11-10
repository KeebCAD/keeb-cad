import type { BlueprintPin, EngineUnavailable } from '@keeb-cad/blueprint'
import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import {
  packLayoutOutput,
  type PackedLayoutOutput,
  type PackedPartsOutput,
  packPartsOutput,
  readLayoutRow,
  readPartsRow,
  type ToModelWorker,
} from '@keeb-cad/protocol'
import { AsyncResult, Result } from '@keeb-cad/result'
import type { LayoutOutput, ResolvedParts, Workspace } from '@keeb-cad/schema'
import {
  aBlueprintId,
  aDesign,
  aFingerprintsFile,
  aLayoutOutput,
  aPartsOutput,
  aResolvedParts,
  aRevision,
  aRoutingFile,
  aVersion,
  aViolation,
  aWorkspace,
} from '@keeb-cad/schema/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { pipelineModule } from '../pipeline-module'
import { Pipeline } from './pipeline'

const FIRST_DELAY = 1000
const EPOCH = 1
const SETTLED = -1

class FakeRunner extends LaneRunner {
  order: string[] = []
  pauses = 0
  held: Promise<void> = Promise.resolve()
  unavailableAfterStages = false
  readonly receivedPins: (readonly BlueprintPin[])[] = []

  override get hasUnavailable(): boolean {
    return this.unavailableAfterStages
  }

  override pause(pins: readonly BlueprintPin[]): AsyncResult<void, EngineUnavailable> {
    this.pauses += 1
    this.order.push('pause')
    this.receivedPins.push(pins)
    return AsyncResult._fromPromiseOfResult(this.#okOnceReleased())
  }

  async #okOnceReleased(): Promise<Result<void, EngineUnavailable>> {
    await this.held
    return Result.ok()
  }
}

interface Arrangement {
  parts?: { value: ResolvedParts }
  placements?: { value: LayoutOutput }
  pins?: readonly BlueprintPin[]
}

async function arrange({
  parts = { value: aResolvedParts() },
  placements = { value: aLayoutOutput() },
  pins = [],
}: Arrangement = {}) {
  const container = new Container()
    .addModule(designWorkerModule)
    .addModule(blueprintWorkerModule)
    .addModule(pipelineModule)
  container.override(LaneRunner).useClass(FakeRunner)
  await container.autoLoad()
  const runner = container.resolve(LaneRunner) as FakeRunner
  const { port1, port2 } = new MessageChannel()
  container.resolve(Pipeline).listen(port1, { parts, placements, pins: { value: pins } })
  return { runner, port1, port2 }
}

type Post = { kind: string; seq: number; stage?: string; violations?: unknown }

function startRecording(port: MessagePort, runner: FakeRunner) {
  const posts: Post[] = []
  const { promise: firstPost, resolve: postArrived } = Promise.withResolvers<void>()
  port.addEventListener('message', (event) => {
    const post = event.data as Post
    runner.order.push(post.kind)
    posts.push(post)
    postArrived()
  })
  port.start()
  return { posts, firstPost }
}

// Resolves once the pipeline, listening first, has handled a message of this kind.
function handled(port: MessagePort, kind: string): Promise<void> {
  return new Promise((resolve) => {
    port.addEventListener('message', (event) => {
      if ((event.data as { kind: string }).kind === kind) resolve()
    })
  })
}

const layoutSetAt = (seq: number, parts: ResolvedParts, placements: LayoutOutput) => ({
  kind: 'layout-set',
  epoch: EPOCH,
  seq,
  parts: packPartsOutput(parts.output),
  layout: packLayoutOutput(placements),
})

const slotRow = (x: number): LayoutOutput['rows'][number] => ({
  kind: 'slot',
  frame: { x, y: 0, rot: 0, mirrored: false },
  anchorAt: { x, y: 0 },
  part: 0,
  fit: 'fitted',
  placed: true,
})

const STAGES_AT_ONE_SEQ = [
  ['stage-started', 'parts'],
  ['stage-started', 'layout'],
  ['layout-set', undefined],
  ['issues', undefined],
  ['derived-files', undefined],
]

const design = (seq: number): ToModelWorker => ({
  kind: 'design',
  epoch: EPOCH,
  seq,
  design: aDesign(),
  routing: aRoutingFile({ revision: aRevision('r0') }),
  fingerprints: aFingerprintsFile({ revision: aRevision('r0') }),
  revision: aRevision(`r${seq}`),
})

const focus = (seq: number, workspace: Workspace): ToModelWorker => ({
  kind: 'focus',
  epoch: EPOCH,
  seq,
  workspace,
})

const patch = (seq: number): ToModelWorker => ({
  kind: 'patches',
  epoch: EPOCH,
  seq,
  patches: [{ op: 'replace', path: ['meta', 'name'], value: `n${seq}` }],
  revision: aRevision(`r${seq}`),
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Pipeline stages', () => {
  it('pauses, then posts every stage of the message seq, issues among them', async () => {
    const violations = [aViolation()]
    const { runner, port2 } = await arrange({ parts: { value: aResolvedParts({ violations }) } })
    const { posts } = startRecording(port2, runner)
    const expectedOrder = ['pause', ...STAGES_AT_ONE_SEQ.map(([kind]) => kind)]

    port2.postMessage(design(1))
    await expect.poll(() => runner.order).toHaveLength(expectedOrder.length)

    expect(runner.order).toEqual(expectedOrder)
    expect(posts.map(({ seq }) => seq)).toEqual(STAGES_AT_ONE_SEQ.map(() => 1))
    expect(posts.find(({ kind }) => kind === 'issues')).toMatchObject({ violations })
  })

  it('pauses again for patches arriving during the pause, then posts only at the newest seq', async () => {
    const { runner, port1, port2 } = await arrange()
    const { posts } = startRecording(port2, runner)
    const { promise, resolve } = Promise.withResolvers<void>()
    runner.held = promise

    port2.postMessage(design(1))
    port2.postMessage(patch(2))
    await expect.poll(() => runner.pauses).toBe(1)
    resolve()
    await expect.poll(() => posts).toHaveLength(STAGES_AT_ONE_SEQ.length)
    // The port is FIFO, so anything already sent arrives before this marker.
    port1.postMessage({ kind: 'settled', seq: SETTLED })
    await expect.poll(() => posts).toHaveLength(STAGES_AT_ONE_SEQ.length + 1)

    expect(posts.map(({ kind, seq }) => [kind, seq])).toEqual([
      ...STAGES_AT_ONE_SEQ.map(([kind]) => [kind, 2]),
      ['settled', SETTLED],
    ])
    expect(runner.pauses).toBe(2)
  })

  it.each([
    ['1 ms before the delay', FIRST_DELAY - 1, 0],
    ['on the delay', FIRST_DELAY, 1],
    ['1 ms after the delay', FIRST_DELAY + 1, 1],
  ])('re-runs on the backoff %s when a stage left a lane unavailable', async (_r, ms, reruns) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { runner, port2 } = await arrange()
    const { firstPost } = startRecording(port2, runner)
    runner.unavailableAfterStages = true
    port2.postMessage(design(1))
    await firstPost
    const before = runner.pauses

    await vi.advanceTimersByTimeAsync(ms)

    expect(runner.pauses - before).toBe(reruns)
  })

  it('leaves no timer pending when nothing was left unavailable', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { runner, port2 } = await arrange()
    const { firstPost } = startRecording(port2, runner)

    port2.postMessage(design(1))
    await firstPost

    expect(vi.getTimerCount()).toBe(0)
  })

  it('hands the derived pins to the pause', async () => {
    const pins = [{ id: aBlueprintId(), version: aVersion() }]
    const { runner, port2 } = await arrange({ pins })

    port2.postMessage(design(1))
    await expect.poll(() => runner.pauses).toBe(1)

    expect(runner.receivedPins).toEqual([pins])
  })

  describe('the layout set', () => {
    it.each([['layout'], ['pcb'], ['case']] as const)(
      'posts it after both stage-started, before issues, with focus on %s',
      async (workspace) => {
        const parts = aResolvedParts({ output: aPartsOutput() })
        const placements = aLayoutOutput({ ids: ['left/a'], rows: [slotRow(0)] })
        const { runner, port1, port2 } = await arrange({
          parts: { value: parts },
          placements: { value: placements },
        })
        const { posts } = startRecording(port2, runner)
        const { promise, resolve } = Promise.withResolvers<void>()
        runner.held = promise
        const focused = handled(port1, 'focus')

        port2.postMessage(design(1))
        port2.postMessage(focus(1, aWorkspace(workspace)))
        await focused
        resolve()
        await expect.poll(() => posts).toHaveLength(STAGES_AT_ONE_SEQ.length)

        expect(posts.map(({ kind, stage }) => [kind, stage])).toEqual(STAGES_AT_ONE_SEQ)
        expect(posts[2]).toEqual(layoutSetAt(1, parts, placements))
      },
    )

    it('carries the parts and placements held at its own seq', async () => {
      const first = {
        parts: aResolvedParts({ output: aPartsOutput({ ids: ['a@h'], rows: [{ w: 18, h: 18 }] }) }),
        placements: aLayoutOutput({ ids: ['left/a'], rows: [slotRow(0)] }),
      }
      const second = {
        parts: aResolvedParts({ output: aPartsOutput({ ids: ['b@h'], rows: [{ w: 9, h: 9 }] }) }),
        placements: aLayoutOutput({ ids: ['left/b'], rows: [slotRow(19)] }),
      }
      const parts = { value: first.parts }
      const placements = { value: first.placements }
      const { runner, port2 } = await arrange({ parts, placements })
      const { posts } = startRecording(port2, runner)
      port2.postMessage(design(1))
      await expect.poll(() => posts).toHaveLength(STAGES_AT_ONE_SEQ.length)

      parts.value = second.parts
      placements.value = second.placements
      port2.postMessage(patch(2))
      await expect.poll(() => posts).toHaveLength(2 * STAGES_AT_ONE_SEQ.length)

      expect(posts.filter(({ kind }) => kind === 'layout-set')).toEqual([
        layoutSetAt(1, first.parts, first.placements),
        layoutSetAt(2, second.parts, second.placements),
      ])
    })

    it('posts the same derivation values intact at two seqs, leaving the values whole', async () => {
      const parts = aResolvedParts({
        output: aPartsOutput({ ids: ['key@h'], rows: [{ w: 22.728, h: 18 }] }),
      })
      const placements = aLayoutOutput({ ids: ['left/a'], rows: [slotRow(22.728)] })
      const { runner, port2 } = await arrange({
        parts: { value: parts },
        placements: { value: placements },
      })
      const { posts } = startRecording(port2, runner)

      port2.postMessage(design(1))
      await expect.poll(() => posts).toHaveLength(STAGES_AT_ONE_SEQ.length)
      port2.postMessage(patch(2))
      await expect.poll(() => posts).toHaveLength(2 * STAGES_AT_ONE_SEQ.length)

      const readBack = posts
        .filter(({ kind }) => kind === 'layout-set')
        .map((post) => {
          const set = post as unknown as {
            seq: number
            parts: PackedPartsOutput
            layout: PackedLayoutOutput
          }
          return {
            seq: set.seq,
            parts: { ids: set.parts.ids, rows: [readPartsRow(set.parts, 0)] },
            layout: { ids: set.layout.ids, rows: [readLayoutRow(set.layout, 0)] },
          }
        })
      const expectedParts = { ids: ['key@h'], rows: [{ w: 22.728, h: 18 }] }
      const expectedLayout = {
        ids: ['left/a'],
        rows: [
          {
            kind: 'slot',
            frame: { x: 22.728, y: 0, rot: 0, mirrored: false },
            anchorAt: { x: 22.728, y: 0 },
            part: 0,
            fit: 'fitted',
            placed: true,
          },
        ],
      }
      expect(readBack).toEqual([
        { seq: 1, parts: expectedParts, layout: expectedLayout },
        { seq: 2, parts: expectedParts, layout: expectedLayout },
      ])
      expect({ parts: parts.output, placements }).toEqual({
        parts: expectedParts,
        placements: expectedLayout,
      })
    })

    it('posts zero-row outputs for zero-row parts and placements', async () => {
      const { runner, port2 } = await arrange({
        parts: { value: aResolvedParts({ output: aPartsOutput({ ids: [], rows: [] }) }) },
        placements: { value: aLayoutOutput() },
      })
      const { posts } = startRecording(port2, runner)

      port2.postMessage(design(1))
      await expect.poll(() => posts).toHaveLength(STAGES_AT_ONE_SEQ.length)

      expect(posts[2]).toEqual({
        kind: 'layout-set',
        epoch: EPOCH,
        seq: 1,
        parts: { ids: [], w: new Float64Array(), h: new Float64Array() },
        layout: {
          ids: [],
          kind: new Uint8Array(),
          x: new Float64Array(),
          y: new Float64Array(),
          rot: new Float64Array(),
          mirrored: new Uint8Array(),
          anchorX: new Float64Array(),
          anchorY: new Float64Array(),
          part: new Int32Array(),
          fit: new Uint8Array(),
          placed: new Uint8Array(),
        },
      })
    })

    it('transfers every column of both outputs, detaching what it sent', async () => {
      const { runner, port1, port2 } = await arrange({
        parts: { value: aResolvedParts({ output: aPartsOutput() }) },
        placements: { value: aLayoutOutput({ ids: ['left/a'], rows: [slotRow(0)] }) },
      })
      const send = vi.spyOn(port1, 'postMessage')
      const { posts } = startRecording(port2, runner)

      port2.postMessage(design(1))
      await expect.poll(() => posts).toHaveLength(STAGES_AT_ONE_SEQ.length)

      const sent = send.mock.calls
        .map(([message]) => message as { kind: string; parts: object; layout: object })
        .find(({ kind }) => kind === 'layout-set')
      const columnLengths = (packed: object | undefined) =>
        Object.fromEntries(
          Object.entries(packed ?? {})
            .filter(([name]) => name !== 'ids')
            .map(([name, column]) => [name, (column as ArrayLike<number>).length]),
        )
      expect({
        parts: columnLengths(sent?.parts),
        layout: columnLengths(sent?.layout),
      }).toEqual({
        parts: { w: 0, h: 0 },
        layout: {
          kind: 0,
          x: 0,
          y: 0,
          rot: 0,
          mirrored: 0,
          anchorX: 0,
          anchorY: 0,
          part: 0,
          fit: 0,
          placed: 0,
        },
      })
    })
  })
})
