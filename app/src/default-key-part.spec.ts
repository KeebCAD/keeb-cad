import type { BlueprintPin, EngineUnavailable, LaneFailure, LaneOutput } from '@keeb-cad/blueprint'
import { argumentHash, blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { DeletePart, NewDesign } from '@keeb-cad/commands'
import { DesignMirror, DesignMirrorWriter, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { createDerivations } from '@keeb-cad/model/worker'
import { Pipeline, pipelineModule } from '@keeb-cad/pipeline'
import { AsyncResult, Option, Result } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import {
  aDesign,
  aFingerprintsFile,
  aLayout,
  anId,
  aRevision,
  aRoutingFile,
  aSlot,
} from '@keeb-cad/schema/testing'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'

import { arrangeModelWorker } from './testing/arrange-model-worker'
import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'
import { runCorneyScript } from './testing/run-corney-script'

// choc-key's keycaps, centred on the slot's frame: 18 × 18 mm at 1u, 27 × 18 mm at 1.5u.
const EXPECTED_1U_KEYCAP = [
  {
    outer: [
      { x: -9, y: -9 },
      { x: 9, y: -9 },
      { x: 9, y: 9 },
      { x: -9, y: 9 },
    ],
    holes: [],
  },
]
const EXPECTED_15U_KEYCAP = [
  {
    outer: [
      { x: -13.5, y: -9 },
      { x: 13.5, y: -9 },
      { x: 13.5, y: 9 },
      { x: -13.5, y: 9 },
    ],
    holes: [],
  },
]

class RecordingRunner extends LaneRunner {
  readonly received: (readonly BlueprintPin[])[] = []
  readonly order: string[] = []

  override pause(pins: readonly BlueprintPin[]): AsyncResult<void, EngineUnavailable> {
    this.order.push('pause')
    this.received.push(pins)
    return AsyncResult.ok()
  }

  override runLane(): Result<LaneOutput, LaneFailure> {
    this.order.push('lane')
    return Result.err({ kind: 'unavailable' })
  }
}

describe('the parts lane, wired by hand', () => {
  it("resolves a slot on key to choc-key's 1u keycap slot space in the real sandbox", async () => {
    const container = new Container().addModule(designWorkerModule).addModule(blueprintWorkerModule)
    await container.autoLoad()
    const runner = container.resolve(LaneRunner)
    runner.useLibrary(libraryData)
    const { parts, pins } = createDerivations(container.resolve(DesignMirror), libraryData, runner)
    const slot = anId('slot')
    container
      .resolve(DesignMirrorWriter)
      .replace(aDesign({ layout: aLayout({ children: [aSlot({ id: slot })] }) }), aRevision())

    await runner.pause(pins.value)

    const run = `key@${argumentHash({ size: '1u' })}`
    expect(parts.value.output).toEqual({ ids: [run], rows: [EXPECTED_1U_KEYCAP] })
    expect(parts.value.slots[slot]).toEqual({ run, fit: 'fitted' })
  })

  it("resolves each of Corney's runs to its keycap in the real sandbox", async () => {
    const store = await arrangeStore(new Container())
    await runCorneyScript(store)
    const container = new Container().addModule(designWorkerModule).addModule(blueprintWorkerModule)
    await container.autoLoad()
    const runner = container.resolve(LaneRunner)
    runner.useLibrary(libraryData)
    const { parts, pins } = createDerivations(container.resolve(DesignMirror), libraryData, runner)
    container.resolve(DesignMirrorWriter).replace(committed(store).design, aRevision())

    await runner.pause(pins.value)

    const { ids, rows } = parts.value.output
    expect(Object.fromEntries(ids.map((id, row) => [id, rows[row]]))).toEqual({
      [`key@${argumentHash({ size: '1u' })}`]: EXPECTED_1U_KEYCAP,
      [`key@${argumentHash({ size: '1.5u' })}`]: EXPECTED_15U_KEYCAP,
    })
  })

  it('first runs a lane after the pause', async () => {
    const container = new Container()
      .addModule(designWorkerModule)
      .addModule(blueprintWorkerModule)
      .addModule(pipelineModule)
    container.override(LaneRunner).useClass(RecordingRunner)
    await container.autoLoad()
    const runner = container.resolve(LaneRunner) as RecordingRunner
    const derivations = createDerivations(container.resolve(DesignMirror), libraryData, runner)
    const { port1, port2 } = new MessageChannel()
    container.resolve(Pipeline).listen(port1, derivations)

    port2.postMessage({
      kind: 'design',
      epoch: 1,
      seq: 1,
      design: aDesign({ layout: aLayout({ children: [aSlot({ id: anId('slot') })] }) }),
      routing: aRoutingFile({ revision: aRevision('r0') }),
      fingerprints: aFingerprintsFile({ revision: aRevision('r0') }),
      revision: aRevision('r1'),
    })

    await expect.poll(() => runner.order).toEqual(['pause', 'lane'])
  })

  it("hands the design's pin to the pause", async () => {
    const container = new Container()
      .addModule(designWorkerModule)
      .addModule(blueprintWorkerModule)
      .addModule(pipelineModule)
    container.override(LaneRunner).useClass(RecordingRunner)
    await container.autoLoad()
    const runner = container.resolve(LaneRunner) as RecordingRunner
    const derivations = createDerivations(container.resolve(DesignMirror), libraryData, runner)
    const { port1, port2 } = new MessageChannel()
    container.resolve(Pipeline).listen(port1, derivations)

    port2.postMessage({
      kind: 'design',
      epoch: 1,
      seq: 1,
      design: aDesign(),
      routing: aRoutingFile({ revision: aRevision('r0') }),
      fingerprints: aFingerprintsFile({ revision: aRevision('r0') }),
      revision: aRevision('r1'),
    })

    await expect
      .poll(() => runner.received)
      .toEqual([[{ id: 'lib:blueprint/choc-key', version: 1 }]])
  })
})

describe('parts.deletePart through mainModules', () => {
  it('refuses to delete key with default-part-required', async () => {
    const store = await arrangeStore(new Container())
    expectOk(await store.run(NewDesign, {}))

    const result = store.run(DeletePart, { id: 'key' })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'default-part-required', ids: ['key'] })
  })
})

describe("the real model worker's parts lane", () => {
  it("posts a choc slot's parts row as its centred 1u keycap, one counter-clockwise loop", async () => {
    // choc-key's 1u run of the default part, packed: one 18 × 18 mm loop, centred, from its
    // bottom-left corner.
    const expectedPosted = {
      ids: [`key@${argumentHash({ size: '1u' })}`],
      rowLoops: [0, 1],
      loopPoints: [0, 4],
      loopHole: [0],
      points: [-9, -9, 9, -9, 9, 9, -9, 9],
    }
    const { store, lifecycle } = await arrangeModelWorker(new Container())
    const design = aDesign({ layout: aLayout({ children: [aSlot({ id: anId('slot') })] }) })

    expectOk(store.replaceDesign({ design, unreadable: [] }))
    // The real worker's start-up: Vite transforms its whole module graph on first load.
    await expect.poll(() => lifecycle.layoutSetArrived, { timeout: 10_000 }).toBe(true)

    expect(
      lifecycle.parts.map(({ output }) => ({
        ids: output.ids,
        rowLoops: [...output.rowLoops],
        loopPoints: [...output.loopPoints],
        loopHole: [...output.loopHole],
        points: [...output.points],
      })),
    ).toEqual(Option.some(expectedPosted))
  })

  it('posts no violation from the real worker entry for a slot on key', async () => {
    const container = new Container()
    const store = await arrangeStore(container)
    const lifecycle = container.resolve(ModelWorkerLifecycle)
    const posts: unknown[] = []
    lifecycle.start(() => {
      const worker = new Worker(new URL('model.worker.ts', import.meta.url), { type: 'module' })
      worker.addEventListener('message', (event) => posts.push(event.data))
      onTestFinished(() => worker.terminate())
      return worker
    })

    const design = aDesign({ layout: aLayout({ children: [aSlot({ id: anId('slot') })] }) })
    expectOk(store.replaceDesign({ design, unreadable: [] }))

    // The real worker's start-up: Vite transforms its whole module graph on first load.
    await expect
      .poll(() => posts, { timeout: 10_000 })
      .toContainEqual({ kind: 'issues', epoch: 1, seq: 1, violations: [] })
  })
})
