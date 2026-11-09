import type { BlueprintPin, EngineUnavailable, LaneFailure, LaneOutput } from '@keeb-cad/blueprint'
import { argumentHash, blueprintWorkerModule, LaneRunner } from '@keeb-cad/blueprint/worker'
import { DeletePart, NewDesign } from '@keeb-cad/commands'
import { DesignStore } from '@keeb-cad/design'
import { DesignMirror, DesignMirrorWriter, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { libraryData } from '@keeb-cad/library/worker'
import { createDerivations } from '@keeb-cad/model/worker'
import { Pipeline, pipelineModule } from '@keeb-cad/pipeline'
import { AsyncResult, Result } from '@keeb-cad/result'
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
import { MemoryBackend, storageBackend } from '@keeb-cad/storage/testing'
import { ModelWorkerLifecycle } from '@keeb-cad/workers'
import { describe, expect, it, onTestFinished } from 'vitest'

import { mainModules } from './main-modules'

async function arrange() {
  const container = new Container()
  for (const module of mainModules) container.addModule(module)
  container.override(storageBackend).useValue(new MemoryBackend())
  await container.autoLoad()
  return {
    store: container.resolve(DesignStore),
    lifecycle: container.resolve(ModelWorkerLifecycle),
  }
}

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
  it('resolves a slot on key to an 18 by 18 mm rectangle in the real sandbox', async () => {
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

    const run = `key@${argumentHash({})}`
    expect(parts.value.output).toEqual({ ids: [run], rows: [{ w: 18, h: 18 }] })
    expect(parts.value.slots[slot]).toEqual({ run, fit: 'fitted' })
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
    const { store } = await arrange()
    expectOk(await store.run(NewDesign, {}))

    const result = store.run(DeletePart, { id: 'key' })

    expectErr(result)
    expect(result.error).toMatchObject({ kind: 'default-part-required', ids: ['key'] })
  })
})

describe("the real model worker's parts lane", () => {
  it('posts no violation from the real worker entry for a slot on key', async () => {
    const { store, lifecycle } = await arrange()
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
