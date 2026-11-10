import {
  type Command,
  type Committed,
  DesignStore,
  designModule,
  registerCommand,
  type Writable,
} from '@keeb-cad/design'
import { Container } from '@keeb-cad/di'
import { packLayoutOutput, packPartsOutput } from '@keeb-cad/protocol'
import { InvariantError, Option } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design, LayoutOutput, PartsOutput, StageId, Workspace } from '@keeb-cad/schema'
import {
  aDesign,
  aFingerprintsFile,
  aLayoutOutput,
  aMeta,
  aPartsOutput,
  aRevision,
  aRoutingFile,
  aStageId,
  aWorkspace,
  aViolation,
} from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { FakeWorker } from '../testing'
import { workersModule } from '../workers-module'
import { ModelWorkerLifecycle } from './model-worker-lifecycle'
import type { Spawn } from './types'

// A test command edits the draft itself, so these tests need no domain.
const renameDesignInputSchema = v.object({ name: v.pipe(v.string(), v.minLength(1)) })
type RenameDesignInput = v.InferOutput<typeof renameDesignInputSchema>

class RenameDesign implements Command<RenameDesignInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = renameDesignInputSchema

  available(): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: RenameDesignInput): void {
    draft.meta.name = input.name
  }
}

interface Arrangement {
  loaded?: boolean
  renamed?: boolean
  renamable?: boolean
}

async function arrange({ loaded = false, renamed = false, renamable = false }: Arrangement = {}) {
  const container = new Container().addModule(designModule).addModule(workersModule)
  if (renamed || renamable) registerCommand(container, RenameDesign)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  if (loaded) load(store)
  if (renamed) expectOk(store.run(RenameDesign, { name: 'Corne v2' }))
  const spawned: FakeWorker[] = []
  const spawn = () => {
    const worker = new FakeWorker()
    spawned.push(worker)
    return worker
  }
  return { store, lifecycle: container.resolve(ModelWorkerLifecycle), spawn, spawned }
}

function load(store: DesignStore, design: Design = aDesign()): void {
  expectOk(store.replaceDesign({ design, unreadable: [] }))
}

function committed(store: DesignStore): Committed {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value
}

function latest(spawned: FakeWorker[]): FakeWorker {
  const worker = spawned.at(-1)
  if (worker === undefined) throw new Error('Expected a spawned worker.')
  return worker
}

// The whole bundle and focus every spawn sends, stamped with the store's state then.
function startMessages(current: Committed, epoch: number, workspace: Workspace = aWorkspace()) {
  const { design, routing, fingerprints, seq, revision } = current
  return [
    { kind: 'design', epoch, seq, design, routing, fingerprints, revision },
    { kind: 'focus', epoch, seq, workspace },
  ]
}

function issuesAt(epoch: number, seq: number, violations: unknown[] = []) {
  return { kind: 'issues', epoch, seq, violations }
}

function stageStartedAt(epoch: number, seq: number, stage: StageId = aStageId()) {
  return { kind: 'stage-started', epoch, seq, stage }
}

const SLOT_ROW: LayoutOutput['rows'][number] = {
  kind: 'slot',
  frame: { x: 0, y: 19, rot: 0, mirrored: false },
  anchorAt: { x: 0, y: 19 },
  part: 0,
  fit: 'fitted',
  placed: true,
}

function layoutSetAt(
  epoch: number,
  seq: number,
  parts: PartsOutput = aPartsOutput(),
  layout: LayoutOutput = aLayoutOutput({ ids: ['left/a'], rows: [SLOT_ROW] }),
) {
  return {
    kind: 'layout-set',
    epoch,
    seq,
    parts: packPartsOutput(parts),
    layout: packLayoutOutput(layout),
  }
}

function derivedFilesAt(epoch: number, seq: number, revision: string) {
  return {
    kind: 'derived-files',
    epoch,
    seq,
    routing: aRoutingFile({ revision: aRevision('accepted') }),
    fingerprints: aFingerprintsFile({ revision: aRevision('accepted') }),
    revision,
  }
}

describe('ModelWorkerLifecycle', () => {
  describe('spawning', () => {
    it('spawns nothing before the first committed design', async () => {
      const { lifecycle, spawn, spawned } = await arrange()

      lifecycle.start(spawn)

      expect({ spawned: spawned.length, status: lifecycle.status }).toEqual({
        spawned: 0,
        status: 'idle',
      })
    })

    it('spawns on the first committed design and sends it whole, then focus', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange()
      lifecycle.start(spawn)

      load(store)

      expect(spawned.map((worker) => worker.received)).toEqual([startMessages(committed(store), 1)])
      expect(lifecycle.status).toBe('running')
    })

    it('spawns at once when a design is already committed', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })

      lifecycle.start(spawn)

      expect(spawned.map((worker) => worker.received)).toEqual([startMessages(committed(store), 1)])
    })

    it.each([
      [
        'layout when start is given none',
        (lifecycle: ModelWorkerLifecycle, spawn: Spawn) => lifecycle.start(spawn),
        'layout',
      ],
      [
        'the workspace start is given',
        (lifecycle: ModelWorkerLifecycle, spawn: Spawn) =>
          lifecycle.start(spawn, aWorkspace('pcb')),
        'pcb',
      ],
    ])('focuses %s', async (_role, start, expected) => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })

      start(lifecycle, spawn)

      expect(latest(spawned).received.at(-1)).toMatchObject({ kind: 'focus', workspace: expected })
    })

    it('throws on a second start', async () => {
      const { lifecycle, spawn } = await arrange()
      lifecycle.start(spawn)

      expect(() => lifecycle.start(spawn)).toThrow(InvariantError)
    })
  })

  describe('sending', () => {
    it("forwards a command's patches at its seq and the current epoch", async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamable: true })
      lifecycle.start(spawn)

      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))

      const { seq, revision } = committed(store)
      expect(latest(spawned).received.at(-1)).toEqual({
        kind: 'patches',
        epoch: 1,
        seq,
        patches: [{ op: 'replace', path: ['meta', 'name'], value: 'Corne v2' }],
        revision,
      })
    })

    it('sends a replaced design whole', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      load(store, aDesign({ meta: aMeta({ name: 'Other' }) }))

      const { design, routing, fingerprints, seq, revision } = committed(store)
      expect(latest(spawned).received.at(-1)).toEqual({
        kind: 'design',
        epoch: 1,
        seq,
        design,
        routing,
        fingerprints,
        revision,
      })
    })

    it('sends a focus switch at the current seq', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamed: true })
      lifecycle.start(spawn)

      lifecycle.focus(aWorkspace('case'))

      expect(latest(spawned).received.at(-1)).toEqual({
        kind: 'focus',
        epoch: 1,
        seq: committed(store).seq,
        workspace: 'case',
      })
    })

    it("lets start's workspace replace one focused before start", async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.focus(aWorkspace('case'))

      lifecycle.start(spawn)

      expect(latest(spawned).received.at(-1)).toMatchObject({ kind: 'focus', workspace: 'layout' })
    })
  })

  describe('crashes', () => {
    it.each([
      ['an error', (worker: FakeWorker) => worker.crash()],
      ['a message that fails to deserialize', (worker: FakeWorker) => worker.failToDeserialize()],
    ])('restarts on %s with the next epoch and the whole design', async (_what, crash) => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      crash(latest(spawned))

      expect(spawned.map((worker) => worker.received.slice(-2))).toEqual([
        startMessages(committed(store), 1),
        startMessages(committed(store), 2),
      ])
      expect(spawned[0]?.terminated).toBe(true)
    })

    it("cancels the worker's error event", async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      const defaultPrevented = !latest(spawned).crash()

      expect(defaultPrevented).toBe(true)
    })

    it('restarts with the focused workspace', async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      lifecycle.focus(aWorkspace('case'))

      latest(spawned).crash()

      expect(latest(spawned).received.at(-1)).toMatchObject({ kind: 'focus', workspace: 'case' })
    })

    it('keeps running below the crash cap', async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      latest(spawned).crash()
      latest(spawned).crash()

      expect({ spawned: spawned.length, status: lifecycle.status }).toEqual({
        spawned: 3,
        status: 'running',
      })
    })

    it('stops restarting on the crash cap', async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      latest(spawned).crash()
      latest(spawned).crash()
      latest(spawned).crash()

      expect({ spawned: spawned.length, status: lifecycle.status }).toEqual({
        spawned: 3,
        status: { message: 'model worker did not load' },
      })
    })

    it('counts no crash from a worker it replaced', async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      const replaced = latest(spawned)
      replaced.crash()

      replaced.crash()
      replaced.crash()

      expect({ spawned: spawned.length, status: lifecycle.status }).toEqual({
        spawned: 2,
        status: 'running',
      })
    })

    it('sends nothing for a commit while failed', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamable: true })
      lifecycle.start(spawn)
      latest(spawned).crash()
      latest(spawned).crash()
      latest(spawned).crash()
      const before = spawned.map((worker) => worker.received.length)

      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))

      expect(spawned.map((worker) => worker.received.length)).toEqual(before)
    })

    it('starts counting again after a layout-set its gate accepts', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).crash()
      latest(spawned).crash()

      latest(spawned).post(layoutSetAt(3, committed(store).seq))
      latest(spawned).crash()

      expect({ spawned: spawned.length, status: lifecycle.status }).toEqual({
        spawned: 4,
        status: 'running',
      })
    })

    it('starts counting again after an issues post its gate accepts', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).crash()
      latest(spawned).crash()

      latest(spawned).post(issuesAt(3, committed(store).seq))
      latest(spawned).crash()
      latest(spawned).crash()

      expect({ spawned: spawned.length, status: lifecycle.status }).toEqual({
        spawned: 5,
        status: 'running',
      })
    })

    it.each([
      ['issues below the latest seq', (seq: number) => issuesAt(3, seq - 1)],
      ['issues from an older epoch', (seq: number) => issuesAt(1, seq)],
    ])('keeps counting after %s', async (_what, makePost) => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamed: true })
      lifecycle.start(spawn)

      latest(spawned).crash()
      latest(spawned).crash()
      latest(spawned).post(makePost(committed(store).seq))
      latest(spawned).crash()

      expect(lifecycle.status).toEqual({ message: 'model worker did not load' })
    })

    it.each([
      ['a stage-started', (seq: number) => stageStartedAt(3, seq)],
      ['a derived-files post', (seq: number) => derivedFilesAt(3, seq, aRevision('accepted'))],
    ])('resets no count on %s at the latest seq', async (_what, makePost) => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).crash()
      latest(spawned).crash()

      latest(spawned).post(makePost(committed(store).seq))
      latest(spawned).crash()

      expect(lifecycle.status).toMatchObject({ message: 'model worker did not load' })
    })

    it('names the stage running at each crash in failed', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      const { seq } = committed(store)

      latest(spawned).post(stageStartedAt(1, seq, 'plates'))
      latest(spawned).crash('boom')
      latest(spawned).post(stageStartedAt(2, seq, 'plates'))
      latest(spawned).crash('boom')
      latest(spawned).post(stageStartedAt(3, seq, 'plates'))
      latest(spawned).crash('boom')

      expect(lifecycle.status).toEqual({ message: 'boom', stage: 'plates' })
    })

    it('names no stage when none started', async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      latest(spawned).crash('boom')
      latest(spawned).crash('boom')
      latest(spawned).crash('boom')

      expect(lifecycle.status).toEqual({ message: 'boom' })
    })

    it('names no stage when a post came after its stage-started', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).crash('boom')
      latest(spawned).crash('boom')
      const { seq, revision } = committed(store)

      latest(spawned).post(stageStartedAt(3, seq))
      latest(spawned).post(derivedFilesAt(3, seq, revision))
      latest(spawned).crash('boom')

      expect(lifecycle.status).toEqual({ message: 'boom' })
    })

    it("takes the last crash's message", async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      latest(spawned).crash('a')
      latest(spawned).crash('b')
      latest(spawned).crash('c')

      expect(lifecycle.status).toEqual({ message: 'c' })
    })

    it.each([
      [
        'a message that fails to deserialize',
        (worker: FakeWorker) => worker.failToDeserialize(),
        'model worker sent an unreadable message',
      ],
      [
        'an error event with no message',
        (worker: FakeWorker) => worker.crash(),
        'model worker did not load',
      ],
      [
        'an error event with an empty message',
        (worker: FakeWorker) => worker.crash(''),
        'model worker did not load',
      ],
    ])('gives failed a fixed text for %s on the cap', async (_what, crash, expected) => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      latest(spawned).crash('boom')
      latest(spawned).crash('boom')
      crash(latest(spawned))

      expect(lifecycle.status).toEqual({ message: expected })
    })
  })

  describe('restart', () => {
    it('spawns again from failed with the next epoch, the whole design and focus', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).crash()
      latest(spawned).crash()
      latest(spawned).crash()

      lifecycle.restart()

      expect({
        spawned: spawned.length,
        received: latest(spawned).received,
        status: lifecycle.status,
      }).toEqual({ spawned: 4, received: startMessages(committed(store), 4), status: 'running' })
    })

    it('clears failed', async () => {
      const { lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).crash('boom')
      latest(spawned).crash('boom')
      latest(spawned).crash('boom')

      lifecycle.restart()

      expect(lifecycle.status).toBe('running')
    })

    it('replaces a running worker and starts counting crashes again', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).crash()
      latest(spawned).crash()
      const replaced = latest(spawned)

      lifecycle.restart()
      latest(spawned).crash()
      latest(spawned).crash()

      expect(replaced.terminated).toBe(true)
      expect(spawned[3]?.received).toEqual(startMessages(committed(store), 4))
      expect(lifecycle.status).toBe('running')
    })

    it('waits for the first committed design when none is held yet', async () => {
      const { lifecycle, spawn, spawned } = await arrange()
      lifecycle.start(spawn)

      lifecycle.restart()

      expect({ spawned: spawned.length, status: lifecycle.status }).toEqual({
        spawned: 0,
        status: 'idle',
      })
    })

    it('throws before start', async () => {
      const { lifecycle } = await arrange()

      expect(() => lifecycle.restart()).toThrow(InvariantError)
    })
  })
  describe('derived files', () => {
    it("hands derived files at the latest seq to the store's accept", async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      const before = committed(store)

      latest(spawned).post(derivedFilesAt(1, before.seq, before.revision))

      expect(committed(store)).toEqual({
        ...before,
        routing: aRoutingFile({ revision: aRevision('accepted') }),
        fingerprints: aFingerprintsFile({ revision: aRevision('accepted') }),
      })
    })

    it('drops derived files below the latest seq', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamable: true })
      lifecycle.start(spawn)
      const before = committed(store)
      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))
      const renamed = committed(store)

      latest(spawned).post(derivedFilesAt(1, before.seq, before.revision))

      expect(committed(store)).toBe(renamed)
    })
  })

  describe('issues', () => {
    it('holds no issues before the first post', async () => {
      const { lifecycle } = await arrange({ loaded: true })

      expect(lifecycle.issues).toEqual(Option.none())
    })

    it("replaces its issues with each accepted post's whole list", async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      const { seq } = committed(store)
      latest(spawned).post(
        issuesAt(1, seq, [aViolation({ message: 'first' }), aViolation({ message: 'second' })]),
      )

      latest(spawned).post(issuesAt(1, seq, [aViolation({ message: 'third' })]))

      expect(lifecycle.issues).toEqual(
        Option.some({ seq, violations: [aViolation({ message: 'third' })] }),
      )
    })

    it('keeps its issues on a post below the latest seq', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamable: true })
      lifecycle.start(spawn)
      const { seq } = committed(store)
      latest(spawned).post(issuesAt(1, seq, [aViolation({ message: 'first' })]))
      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))

      latest(spawned).post(issuesAt(1, seq, [aViolation({ message: 'stale' })]))

      expect(lifecycle.issues).toEqual(
        Option.some({ seq, violations: [aViolation({ message: 'first' })] }),
      )
    })
  })

  describe('the running stage', () => {
    it('holds a stage-started at the latest seq with its arrival time', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      vi.useFakeTimers()
      onTestFinished(() => {
        vi.useRealTimers()
      })
      const startedAt = performance.now()
      const waited = 250
      vi.advanceTimersByTime(waited)

      latest(spawned).post(stageStartedAt(1, committed(store).seq, 'plates'))

      expect(lifecycle.runningStage).toEqual(
        Option.some({ stage: 'plates', arrivedAt: startedAt + waited }),
      )
    })

    it('holds none for a stage-started below the latest seq', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamed: true })
      lifecycle.start(spawn)

      latest(spawned).post(stageStartedAt(1, committed(store).seq - 1, 'plates'))

      expect(lifecycle.runningStage).toEqual(Option.none())
    })

    it('clears on a crash below the cap, which starts a new epoch', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).post(stageStartedAt(1, committed(store).seq))

      latest(spawned).crash('boom')

      expect(lifecycle.runningStage).toEqual(Option.none())
    })

    it('clears on an accepted issues post', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      const { seq } = committed(store)
      latest(spawned).post(stageStartedAt(1, seq))

      latest(spawned).post(issuesAt(1, seq))

      expect(lifecycle.runningStage).toEqual(Option.none())
    })

    it('clears on an accepted layout-set', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      const { seq } = committed(store)
      latest(spawned).post(stageStartedAt(1, seq))

      latest(spawned).post(layoutSetAt(1, seq))

      expect(lifecycle.runningStage).toEqual(Option.none())
    })

    it('stays on an issues post below the latest seq', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamable: true })
      lifecycle.start(spawn)
      const { seq } = committed(store)
      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))
      const latestSeq = committed(store).seq
      latest(spawned).post(stageStartedAt(1, latestSeq, 'plates'))

      latest(spawned).post(issuesAt(1, seq))

      expect(lifecycle.runningStage).toEqual(
        Option.some({ stage: 'plates', arrivedAt: expect.any(Number) }),
      )
    })
  })

  describe('the layout set', () => {
    it("holds each output of a layout-set at main's latest seq, with that seq", async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      const { seq } = committed(store)
      const posted = layoutSetAt(
        1,
        seq,
        aPartsOutput({ ids: ['key@h'], rows: [{ w: 18, h: 18 }] }),
        aLayoutOutput({ ids: ['left/a'], rows: [SLOT_ROW] }),
      )

      latest(spawned).post(posted)

      expect({ parts: lifecycle.parts, layout: lifecycle.layout }).toEqual({
        parts: Option.some({ seq, output: posted.parts }),
        layout: Option.some({ seq, output: posted.layout }),
      })
    })

    it.each([
      ['a posted id', 'left/a', Option.some(SLOT_ROW)],
      ['an id the post lacks', 'left/b', Option.none()],
    ])('reads the layout row of %s', async (_role, id, expected) => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      latest(spawned).post(
        layoutSetAt(
          1,
          committed(store).seq,
          aPartsOutput({ ids: ['key@h'], rows: [{ w: 18, h: 18 }] }),
          aLayoutOutput({ ids: ['left/a'], rows: [SLOT_ROW] }),
        ),
      )

      expect(lifecycle.layoutRow(id)).toEqual(expected)
    })

    it('reads no layout row before any layout-set', async () => {
      const { lifecycle } = await arrange({ loaded: true })

      expect(lifecycle.layoutRow('left/a')).toEqual(Option.none())
    })

    it('has not arrived before any layout-set', async () => {
      const { lifecycle, spawn } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      expect(lifecycle.layoutSetArrived).toBe(false)
    })

    it("has arrived with a layout-set at main's latest seq", async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)

      latest(spawned).post(layoutSetAt(1, committed(store).seq))

      expect(lifecycle.layoutSetArrived).toBe(true)
    })

    it('has not arrived after a commit, until the next layout-set', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamable: true })
      lifecycle.start(spawn)
      latest(spawned).post(layoutSetAt(1, committed(store).seq))

      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))
      const afterCommit = lifecycle.layoutSetArrived
      latest(spawned).post(layoutSetAt(1, committed(store).seq))

      expect({ afterCommit, afterNextSet: lifecycle.layoutSetArrived }).toEqual({
        afterCommit: false,
        afterNextSet: true,
      })
    })

    it('holds no outputs after any whole commit', async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true })
      lifecycle.start(spawn)
      latest(spawned).post(layoutSetAt(1, committed(store).seq))
      const accepted = lifecycle.layout.isSome()

      load(store)

      expect({ accepted, parts: lifecycle.parts, layout: lifecycle.layout }).toEqual({
        accepted: true,
        parts: Option.none(),
        layout: Option.none(),
      })
    })

    it("keeps both outputs on a layout-set below main's latest seq", async () => {
      const { store, lifecycle, spawn, spawned } = await arrange({ loaded: true, renamable: true })
      lifecycle.start(spawn)
      const { seq } = committed(store)
      const kept = layoutSetAt(1, seq)
      latest(spawned).post(kept)
      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))

      latest(spawned).post(
        layoutSetAt(1, seq, aPartsOutput({ ids: [], rows: [] }), aLayoutOutput()),
      )

      expect({ parts: lifecycle.parts, layout: lifecycle.layout }).toEqual({
        parts: Option.some({ seq, output: kept.parts }),
        layout: Option.some({ seq, output: kept.layout }),
      })
    })
  })
})
