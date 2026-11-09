import { blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import type { BlueprintPin, EngineUnavailable } from '@keeb-cad/blueprint'
import { designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import type { ToModelWorker } from '@keeb-cad/protocol'
import { AsyncResult, Result } from '@keeb-cad/result'
import {
  aBlueprintId,
  aDesign,
  aFingerprintsFile,
  aResolvedParts,
  aRevision,
  aRoutingFile,
  aVersion,
} from '@keeb-cad/schema/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { pipelineModule } from '../pipeline-module'
import { Pipeline } from '../pipeline/pipeline'
import { BlueprintPause } from './blueprint-pause'

const FIRST_DELAY = 1000
const noStages = () => {}
const SECOND_RETRY_AT = 3000
const CAPPED_RETRY_AT = 91_000
const AT_SIXTEEN_SECOND_DELAY = 15_000

class FakeRunner extends LaneRunner {
  pauses = 0
  answer: Result<void, EngineUnavailable> = Result.ok()
  unavailable = false
  held: Promise<void> = Promise.resolve()
  readonly receivedPins: (readonly BlueprintPin[])[] = []

  override get hasUnavailable(): boolean {
    return this.unavailable
  }

  override pause(pins: readonly BlueprintPin[]): AsyncResult<void, EngineUnavailable> {
    this.pauses += 1
    this.receivedPins.push(pins)
    return AsyncResult._fromPromiseOfResult(this.#answerOnceReleased())
  }

  async #answerOnceReleased(): Promise<Result<void, EngineUnavailable>> {
    await this.held
    return this.answer
  }
}

async function arrange() {
  const container = new Container()
    .addModule(designWorkerModule)
    .addModule(blueprintWorkerModule)
    .addModule(pipelineModule)
  container.override(LaneRunner).useClass(FakeRunner)
  await container.autoLoad()
  return {
    pause: container.resolve(BlueprintPause),
    runner: container.resolve(LaneRunner) as FakeRunner,
    pipeline: container.resolve(Pipeline),
  }
}

async function arrangeFailing() {
  vi.useFakeTimers()
  const arranged = await arrange()
  arranged.runner.answer = Result.err({ kind: 'engine-unavailable' })
  return arranged
}

afterEach(() => {
  vi.useRealTimers()
})

describe('BlueprintPause', () => {
  it.each([
    ['just before the first delay', FIRST_DELAY - 1, 0],
    ['on the first delay', FIRST_DELAY, 1],
    ['just after the first delay', FIRST_DELAY + 1, 1],
  ])('after an Err, %s', async (_role, elapsed, expectedRetries) => {
    const { pause, runner } = await arrangeFailing()
    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)
    const before = runner.pauses

    await vi.advanceTimersByTimeAsync(elapsed)

    expect(runner.pauses - before).toBe(expectedRetries)
  })

  it.each([
    ['just before the doubled delay', SECOND_RETRY_AT - 1, 1],
    ['on the doubled delay', SECOND_RETRY_AT, 2],
    ['just after the doubled delay', SECOND_RETRY_AT + 1, 2],
  ])('after a second failure, %s', async (_role, elapsed, expectedRetries) => {
    const { pause, runner } = await arrangeFailing()
    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)
    const before = runner.pauses

    await vi.advanceTimersByTimeAsync(elapsed)

    expect(runner.pauses - before).toBe(expectedRetries)
  })

  it.each([
    ['just before the capped delay', CAPPED_RETRY_AT - 1, 6],
    ['on the capped delay', CAPPED_RETRY_AT, 7],
    ['just after the capped delay', CAPPED_RETRY_AT + 1, 7],
  ])('past the doubling, %s', async (_role, elapsed, expectedRetries) => {
    const { pause, runner } = await arrangeFailing()
    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)
    const before = runner.pauses

    await vi.advanceTimersByTimeAsync(elapsed)

    expect(runner.pauses - before).toBe(expectedRetries)
  })

  it('retries while a lane is unavailable after a clean pause', async () => {
    vi.useFakeTimers()
    const { pause, runner } = await arrange()
    runner.unavailable = true

    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(FIRST_DELAY)

    expect(runner.pauses).toBe(2)
  })

  it('re-runs at once on an edit while waiting', async () => {
    const { pause, runner } = await arrangeFailing()
    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)
    const before = runner.pauses

    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)

    expect(runner.pauses).toBe(before + 1)
  })

  it('restarts the backoff at the first delay when an edit retries and fails', async () => {
    const { pause, runner } = await arrangeFailing()
    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(AT_SIXTEEN_SECOND_DELAY)
    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)
    const afterEdit = runner.pauses

    await vi.advanceTimersByTimeAsync(FIRST_DELAY - 1)
    const justBefore = runner.pauses
    await vi.advanceTimersByTimeAsync(1)

    expect([justBefore, runner.pauses]).toEqual([afterEdit, afterEdit + 1])
  })

  it('hands the pins from the source to the runner on the first pause and on the timer retry', async () => {
    const { pause, runner } = await arrangeFailing()
    const pins = [{ id: aBlueprintId(), version: aVersion() }]

    pause.enter(() => pins, noStages)
    await vi.advanceTimersByTimeAsync(FIRST_DELAY)

    expect(runner.receivedPins).toEqual([pins, pins])
  })

  it('leaves no timer pending with nothing unavailable', async () => {
    vi.useFakeTimers()
    const { pause } = await arrange()

    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('runs one more pause when an edit arrives during a pause', async () => {
    vi.useFakeTimers()
    const { pause, runner } = await arrange()
    const { promise, resolve: release } = Promise.withResolvers<void>()
    runner.held = promise

    pause.enter(() => [], noStages)
    pause.enter(() => [], noStages)
    pause.enter(() => [], noStages)
    await vi.advanceTimersByTimeAsync(0)
    const startedWhileHeld = runner.pauses
    release()
    await vi.advanceTimersByTimeAsync(0)

    expect([startedWhileHeld, runner.pauses]).toEqual([1, 2])
  })

  it.each<[string, ToModelWorker[]]>([
    [
      'a whole design',
      [
        {
          kind: 'design',
          epoch: 1,
          seq: 1,
          design: aDesign(),
          routing: aRoutingFile({ revision: aRevision('r0') }),
          fingerprints: aFingerprintsFile({ revision: aRevision('r0') }),
          revision: aRevision('r1'),
        },
      ],
    ],
    [
      'patches',
      [
        {
          kind: 'design',
          epoch: 1,
          seq: 1,
          design: aDesign(),
          routing: aRoutingFile({ revision: aRevision('r0') }),
          fingerprints: aFingerprintsFile({ revision: aRevision('r0') }),
          revision: aRevision('r1'),
        },
        {
          kind: 'patches',
          epoch: 1,
          seq: 2,
          patches: [{ op: 'replace', path: ['meta', 'name'], value: 'x' }],
          revision: aRevision('r2'),
        },
      ],
    ],
  ])('enters the pause when %s arrives', async (_role, messages) => {
    const { pipeline, runner } = await arrange()
    const { port1, port2 } = new MessageChannel()
    pipeline.listen(port1, { parts: { value: aResolvedParts() }, pins: { value: [] } })

    for (const message of messages) port2.postMessage(message)

    await expect.poll(() => runner.pauses).toBe(messages.length)
  })
})
