import { DeleteNode } from '@keeb-cad/commands'
import type { DesignStore } from '@keeb-cad/design'
import { DesignMirror, DesignMirrorWriter, designWorkerModule } from '@keeb-cad/design/worker'
import { Container } from '@keeb-cad/di'
import { corneyIslandTestOverrides } from '@keeb-cad/reference-designs/scripts'
import type { Rejection } from '@keeb-cad/schema'
import { type Result } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import { type BundleTexts, writeBundle } from '@keeb-cad/storage'
import { describe, expect, it } from 'vitest'

import { arrangeStore } from './testing/arrange-store'
import { committed } from './testing/committed'
import { runCorneyScript } from './testing/run-corney-script'

// Comfortably above the entries Corney's script makes, so a history that never runs out fails
// the assertion instead of hanging.
const MAX_STEPS = 1000

// A same-thread mirror on its own container, fed every commit event the store emits.
async function arrangeMirror(store: DesignStore): Promise<DesignMirror> {
  const worker = new Container().addModule(designWorkerModule)
  await worker.autoLoad()
  const writer = worker.resolve(DesignMirrorWriter)
  store.events.on('commit', (event) => {
    if (event.kind === 'whole') {
      writer.replace(structuredClone(event.committed.design), event.committed.revision)
    } else {
      writer.apply(structuredClone(event.patches), event.revision)
    }
  })
  return worker.resolve(DesignMirror)
}

// What each step left, until one is unavailable: the bundle's texts, and the mirror beside the
// store's design.
function replayAll(
  store: DesignStore,
  mirror: DesignMirror,
  step: (store: DesignStore) => Result<void, Rejection>,
) {
  const reached: { texts: BundleTexts; mirror: unknown; design: unknown }[] = []
  while (reached.length < MAX_STEPS && step(store).isOk()) {
    reached.push({
      texts: writeBundle(committed(store)),
      mirror: mirror.value,
      design: committed(store).design,
    })
  }
  return reached
}

describe('undo and redo through mainModules', () => {
  it("undoes and redoes every step of Corney's script, the bundle and the mirror matching each revision", async () => {
    const store = await arrangeStore(new Container())
    const mirror = await arrangeMirror(store)
    const recorded: BundleTexts[] = []
    const stopRecording = store.events.on('commit', () => {
      recorded.push(writeBundle(committed(store)))
    })
    await runCorneyScript(store)
    stopRecording()

    const undone = replayAll(store, mirror, (each) => each.undo())
    const redone = replayAll(store, mirror, (each) => each.redo())

    expect(undone.map(({ texts }) => texts)).toEqual(recorded.slice(0, -1).toReversed())
    expect(redone.map(({ texts }) => texts)).toEqual(recorded.slice(1))
    expect([...undone, ...redone].map(({ mirror: value }) => value)).toEqual(
      [...undone, ...redone].map(({ design }) => design),
    )
  })

  it('brings back a deleted slot and the override keyed to it with one undo', async () => {
    const store = await arrangeStore(new Container())
    await runCorneyScript(store, corneyIslandTestOverrides)
    const before = committed(store).design
    expectOk(store.run(DeleteNode, { ids: ['thumbfan-far-home'] }))
    const deleted = committed(store).design

    expect(deleted.overrides).toEqual([])

    expectOk(store.undo())

    expect(committed(store).design).toEqual(before)
  })
})
