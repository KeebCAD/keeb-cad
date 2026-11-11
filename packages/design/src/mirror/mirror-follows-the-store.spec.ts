import { Container } from '@keeb-cad/di'
import { Result } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'
import { aDesign } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designModule } from '../design-module'
import { registerCommand } from '../entries/register-command'
import type { Command } from '../entries/types'
import type { Writable } from '../patching/types'
import { DesignStore } from '../store/design-store'
import type { Committed, CommitEvent } from '../store/types'
import { expectDeeplyFrozen } from '../testing'
import { designWorkerModule } from '../worker-module'
import { DesignMirror } from './design-mirror'
import { DesignMirrorWriter } from './design-mirror-writer'

// A test command edits the draft itself, so the mirror's tests need no domain.
const renameDesignInputSchema = v.object({ name: v.pipe(v.string(), v.minLength(1)) })
type RenameDesignInput = v.InferOutput<typeof renameDesignInputSchema>

class RenameDesign implements Command<RenameDesignInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = renameDesignInputSchema

  available(_design: Frozen<Design>): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, input: RenameDesignInput): void {
    draft.meta.name = input.name
  }
}

// Main and the model worker each build their own container; only plain values pass between them.
async function arrange() {
  const main = new Container().addModule(designModule)
  registerCommand(main, RenameDesign)
  const worker = new Container().addModule(designWorkerModule)
  await main.autoLoad()
  await worker.autoLoad()
  const store = main.resolve(DesignStore)
  expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))
  const loaded = committed(store)
  const writer = worker.resolve(DesignMirrorWriter)
  writer.replace(structuredClone(loaded.design), loaded.revision)
  return { store, writer, mirror: worker.resolve(DesignMirror) }
}

function committed(store: DesignStore): Committed {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value
}

function recordPatchCommits(store: DesignStore) {
  const events: Extract<CommitEvent, { kind: 'patches' }>[] = []
  store.events.on('commit', (event) => {
    if (event.kind === 'patches') events.push(event)
  })
  return events
}

describe('the design mirror', () => {
  it("follows the store through a command's patches, deeply frozen", async () => {
    const { store, writer, mirror } = await arrange()
    const commits = recordPatchCommits(store)

    expectOk(store.run(RenameDesign, { name: 'Corne v2' }))
    for (const { patches, revision } of commits) writer.apply(structuredClone(patches), revision)

    expect(mirror.value).toEqual(committed(store).design)
    expectDeeplyFrozen(mirror.value)
  })

  it("follows the store through two commands' patches applied in commit order", async () => {
    const { store, writer, mirror } = await arrange()
    const commits = recordPatchCommits(store)

    expectOk(store.run(RenameDesign, { name: 'Corne v2' }))
    expectOk(store.run(RenameDesign, { name: 'Corne v3' }))
    for (const { patches, revision } of commits) writer.apply(structuredClone(patches), revision)

    expect({ design: mirror.value, revision: mirror.revision }).toEqual({
      design: committed(store).design,
      revision: committed(store).revision,
    })
  })
})
