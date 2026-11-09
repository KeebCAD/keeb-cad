import type { BlueprintPin, EngineUnavailable } from '@keeb-cad/blueprint'
import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import type { ToModelWorker } from '@keeb-cad/protocol'
import { AsyncResult, Result } from '@keeb-cad/result'
import type { ResolvedParts } from '@keeb-cad/schema'
import {
  aBlueprintId,
  aDesign,
  aFingerprintsFile,
  aResolvedParts,
  aRevision,
  aRoutingFile,
  aVersion,
  aViolation,
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

async function arrange(
  parts: ResolvedParts = aResolvedParts(),
  pins: readonly BlueprintPin[] = [],
) {
  const container = new Container()
    .addModule(designWorkerModule)
    .addModule(blueprintWorkerModule)
    .addModule(pipelineModule)
  container.override(LaneRunner).useClass(FakeRunner)
  await container.autoLoad()
  const runner = container.resolve(LaneRunner) as FakeRunner
  const { port1, port2 } = new MessageChannel()
  container.resolve(Pipeline).listen(port1, { parts: { value: parts }, pins: { value: pins } })
  return { runner, port1, port2 }
}

function startRecording(port: MessagePort, runner: FakeRunner) {
  const posts: { kind: string; seq: number; violations?: unknown }[] = []
  const { promise: firstPost, resolve: postArrived } = Promise.withResolvers<void>()
  port.addEventListener('message', (event) => {
    const post = event.data as { kind: string; seq: number }
    runner.order.push(post.kind)
    posts.push(post)
    postArrived()
  })
  port.start()
  return { posts, firstPost }
}

const design = (seq: number): ToModelWorker => ({
  kind: 'design',
  epoch: EPOCH,
  seq,
  design: aDesign(),
  routing: aRoutingFile({ revision: aRevision('r0') }),
  fingerprints: aFingerprintsFile({ revision: aRevision('r0') }),
  revision: aRevision(`r${seq}`),
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
  it('pauses, then posts stage-started, issues and derived files at the message seq', async () => {
    const violations = [aViolation()]
    const { runner, port2 } = await arrange(aResolvedParts({ violations }))
    const { posts } = startRecording(port2, runner)

    port2.postMessage(design(1))
    await expect.poll(() => posts).toHaveLength(3)

    expect(runner.order).toEqual(['pause', 'stage-started', 'issues', 'derived-files'])
    expect(posts.map(({ seq }) => seq)).toEqual([1, 1, 1])
    expect(posts[1]).toMatchObject({ kind: 'issues', violations })
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
    await expect.poll(() => posts).toHaveLength(3)
    // The port is FIFO, so anything already sent arrives before this marker.
    port1.postMessage({ kind: 'settled', seq: SETTLED })
    await expect.poll(() => posts).toHaveLength(4)

    expect(posts.map(({ kind, seq }) => [kind, seq])).toEqual([
      ['stage-started', 2],
      ['issues', 2],
      ['derived-files', 2],
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
    const { runner, port2 } = await arrange(aResolvedParts(), pins)

    port2.postMessage(design(1))
    await expect.poll(() => runner.pauses).toBe(1)

    expect(runner.receivedPins).toEqual([pins])
  })
})
