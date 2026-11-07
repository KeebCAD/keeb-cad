import { Container, inject } from '@keeb-cad/di'
import { hash } from '@keeb-cad/hashing'
import { isProxy, reactive } from '@keeb-cad/reactive'
import { AsyncResult, InvariantError, Option } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import {
  type Design,
  type DesignInvalid,
  type Form,
  formSchema,
  type Frozen,
  type Rejection,
} from '@keeb-cad/schema'
import {
  aDesign,
  aFingerprintsFile,
  aMeta,
  aRevision,
  aRoutingFile,
} from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designModule } from '../design-module'
import { registerAction } from '../entries/register-action'
import { registerCommand } from '../entries/register-command'
import type { Action, ActionHandle, Command, CommandHandle } from '../entries/types'
import type { Writable } from '../patching/types'
import { expectDeeplyFrozen, expectNothingFrozen } from '../testing'
import { DesignStore } from './design-store'
import { DuplicateCommandIdError } from './duplicate-command-id-error'
import type { Committed, CommitEvent } from './types'

// Unlike a real command, which forwards to one model operation, a test command edits the draft
// itself, so the store's tests need no domain.
const renameDesignInputSchema = v.object({ name: v.pipe(v.string(), v.minLength(1)) })
type RenameDesignInput = v.InferOutput<typeof renameDesignInputSchema>

class RenameDesign implements Command<RenameDesignInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = renameDesignInputSchema

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: RenameDesignInput): void {
    draft.meta.name = input.name
  }
}

const setFormInputSchema = v.object({ form: formSchema })
type SetFormInput = v.InferOutput<typeof setFormInputSchema>

class SetForm implements Command<SetFormInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.setForm'
  static readonly label = 'Set form'
  static readonly input = setFormInputSchema

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: SetFormInput): void {
    draft.meta.form = input.form
  }
}

const spreadRenameInputSchema = v.object({ name: v.string(), note: v.optional(v.string()) })
type SpreadRenameInput = v.InferOutput<typeof spreadRenameInputSchema>

// Spreads its whole input into meta, so a key the design schema refuses reaches the design.
class SpreadRename implements Command<SpreadRenameInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.spreadRename'
  static readonly label = 'Spread rename'
  static readonly input = spreadRenameInputSchema

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: SpreadRenameInput): void {
    draft.meta = { ...draft.meta, ...input }
  }
}

// Passes its form through unrebuilt, so only the store's copy keeps the caller's object out.
const storeFormInputSchema = v.object({
  form: v.custom<Form>((value) => v.is(formSchema, value)),
})
type StoreFormInput = v.InferOutput<typeof storeFormInputSchema>

class StoreForm implements Command<StoreFormInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.storeForm'
  static readonly label = 'Store form'
  static readonly input = storeFormInputSchema

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: StoreFormInput): void {
    draft.meta.form = input.form
  }
}

const looseRenameInputSchema = v.looseObject({ name: v.string() })
type LooseRenameInput = v.InferOutput<typeof looseRenameInputSchema>

class LooseRename implements Command<LooseRenameInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.looseRename'
  static readonly label = 'Loose rename'
  static readonly input = looseRenameInputSchema

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: LooseRenameInput): void {
    draft.meta.name = input.name
  }
}

const loadDesignInputSchema = v.object({
  design: v.pipe(
    v.unknown(),
    v.check((value) => value !== null, 'A design to load.'),
  ),
})
type LoadDesignInput = v.InferOutput<typeof loadDesignInputSchema>

class LoadDesign implements Action<LoadDesignInput, DesignInvalid> {
  static readonly kind = 'action'
  static readonly id = 'file.loadDesign'
  static readonly label = 'Load design'
  static readonly input = loadDesignInputSchema

  available(_current: Option<Committed>): boolean {
    return true
  }

  apply(input: LoadDesignInput): AsyncResult<void, DesignInvalid> {
    return AsyncResult.fromResult(
      this.#store.replaceDesign({ design: input.design, unreadable: [] }).map(() => {}),
    )
  }

  readonly #store = inject(DesignStore)
}

const recordInputInputSchema = v.unknown()
type RecordInputInput = v.InferOutput<typeof recordInputInputSchema>

// Passes any input through and records what apply receives into the test's own list.
function recordInputAction(received: unknown[]) {
  return class RecordInput implements Action<RecordInputInput, never> {
    static readonly kind = 'action'
    static readonly id = 'file.recordInput'
    static readonly label = 'Record input'
    static readonly input = recordInputInputSchema

    available(_current: Option<Committed>): boolean {
      return true
    }

    apply(input: RecordInputInput): AsyncResult<void, never> {
      received.push(input)
      return AsyncResult.ok()
    }
  }
}

interface Arrangement {
  commands?: CommandHandle[]
  actions?: ActionHandle[]
  design?: unknown
}

async function arrange(arrangement: Arrangement = {}): Promise<DesignStore> {
  const container = new Container().addModule(designModule)
  for (const handle of arrangement.commands ?? []) registerCommand(container, handle)
  for (const handle of arrangement.actions ?? []) registerAction(container, handle)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  if (arrangement.design !== undefined) {
    expectOk(store.replaceDesign({ design: arrangement.design, unreadable: [] }))
  }
  return store
}

function unibodyDesign() {
  return aDesign({ meta: aMeta({ form: { type: 'unibody' } }) })
}

// The derived files a design starts with, written out as the requirement states them.
function emptyDerivedFilesAt(revision: string) {
  return { routing: { revision }, fingerprints: { revision, fingerprints: [] } }
}

function recordCommits(store: DesignStore): CommitEvent[] {
  const events: CommitEvent[] = []
  store.events.on('commit', (event) => events.push(event))
  return events
}

function recordAccepts(store: DesignStore): Committed[] {
  const accepted: Committed[] = []
  store.events.on('accept', (event) => accepted.push(event))
  return accepted
}

// Derived files at another revision than the design's, so an accepted one shows.
function acceptedFiles() {
  return {
    routing: aRoutingFile({ revision: aRevision('accepted') }),
    fingerprints: aFingerprintsFile({ revision: aRevision('accepted') }),
  }
}

function committed(store: DesignStore): Committed {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value
}

function expectNothingCommitted(
  store: DesignStore,
  before: Option<Committed>,
  events: CommitEvent[],
): void {
  expect(store.current.getOrUndefined()).toBe(before.getOrUndefined())
  expect(events).toEqual([])
}

describe('DesignStore', () => {
  describe('run, for a command', () => {
    it('commits a command: a frozen design, the next seq, its revision and its patches', async () => {
      const store = await arrange({ commands: [RenameDesign], design: aDesign() })
      const before = committed(store)
      const events = recordCommits(store)

      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))

      const design = { ...before.design, meta: { ...before.design.meta, name: 'Corne v2' } }
      const after = { design, seq: before.seq + 1, revision: hash(design) }
      expect(committed(store)).toEqual({ ...after, ...emptyDerivedFilesAt(before.revision) })
      expectDeeplyFrozen(committed(store).design)
      expect(events).toEqual([
        {
          kind: 'patches',
          patches: [{ op: 'replace', path: ['meta', 'name'], value: 'Corne v2' }],
          seq: after.seq,
          revision: after.revision,
        },
      ])
    })

    it.each([
      ['a plain object', () => ({ form: { type: 'unibody' as const } })],
      ['a Vue reactive object', () => reactive({ form: { type: 'unibody' as const } })],
    ])('stores %s as plain data and never freezes it', async (_name, makeInput) => {
      const store = await arrange({ commands: [SetForm], design: aDesign() })
      const before = committed(store)
      const input = makeInput()

      expectOk(store.run(SetForm, input))

      const design = {
        ...before.design,
        meta: { ...before.design.meta, form: { type: 'unibody' } },
      }
      expect(committed(store)).toEqual({
        design,
        ...emptyDerivedFilesAt(before.revision),
        seq: before.seq + 1,
        revision: hash(design),
      })
      expectDeeplyFrozen(committed(store).design)
      expectNothingFrozen(input)
    })

    it('commits nothing for a command that changes nothing', async () => {
      const store = await arrange({ commands: [RenameDesign], design: aDesign() })
      const before = store.current
      const events = recordCommits(store)

      expectOk(store.run(RenameDesign, { name: committed(store).design.meta.name }))

      expectNothingCommitted(store, before, events)
    })

    it('commits a design whose spread input carries no key the design schema refuses', async () => {
      const store = await arrange({ commands: [SpreadRename], design: aDesign() })
      const before = committed(store)

      expectOk(store.run(SpreadRename, { name: 'Corne v2' }))

      expect(committed(store).design).toEqual({
        ...before.design,
        meta: { ...before.design.meta, name: 'Corne v2' },
      })
      expect(committed(store).seq).toBe(before.seq + 1)
    })

    it('throws on a produced design the design schema refuses, naming the command and the path, committing nothing', async () => {
      const store = await arrange({ commands: [SpreadRename], design: aDesign() })
      const before = store.current
      const events = recordCommits(store)

      expect(() => store.run(SpreadRename, { name: 'Corne v2', note: 'draft' })).toThrow(
        new InvariantError(
          'Command "meta.spreadRename" produced a design the design schema refuses at meta.note.',
        ),
      )

      expectNothingCommitted(store, before, events)
    })

    it("stores a copy of input its schema passes through, never freezing the caller's", async () => {
      const store = await arrange({ commands: [StoreForm], design: aDesign() })
      const input = { form: { type: 'unibody' as const } }

      expectOk(store.run(StoreForm, input))

      const stored = committed(store).design.meta.form
      expect(stored).toEqual(input.form)
      expect(stored).not.toBe(input.form)
      expectDeeplyFrozen(committed(store).design)
      expectNothingFrozen(input)
    })

    it("stores reactive input its schema passes through as plain data, never freezing the caller's", async () => {
      const store = await arrange({ commands: [StoreForm], design: aDesign() })
      const form = { type: 'unibody' as const }
      const input = reactive({ form })

      expectOk(store.run(StoreForm, input))

      const stored = committed(store).design.meta.form
      expect(stored).toEqual(form)
      expect(isProxy(stored)).toBe(false)
      expectDeeplyFrozen(committed(store).design)
      expectNothingFrozen(input)
    })

    it('throws on a reactive value nested in plain input, committing nothing', async () => {
      const store = await arrange({ commands: [StoreForm], design: aDesign() })
      const before = store.current
      const events = recordCommits(store)
      const state = reactive({ form: { type: 'unibody' as const } })

      expect(() => store.run(StoreForm, { form: state.form })).toThrow(
        expect.objectContaining({ name: 'DataCloneError' }),
      )

      expectNothingCommitted(store, before, events)
    })

    it('throws on input it cannot copy, committing nothing', async () => {
      const store = await arrange({ commands: [LooseRename], design: aDesign() })
      const before = store.current
      const events = recordCommits(store)

      expect(() => store.run(LooseRename, { name: 'x', onDone: () => {} })).toThrow(
        expect.objectContaining({ name: 'DataCloneError' }),
      )

      expectNothingCommitted(store, before, events)
    })

    it('throws on input it cannot copy before asking whether the command is available', async () => {
      const lockedRenameInputSchema = v.looseObject({ name: v.string() })
      type LockedRenameInput = v.InferOutput<typeof lockedRenameInputSchema>

      class LockedRename implements Command<LockedRenameInput> {
        static readonly kind = 'command'
        static readonly id = 'meta.lockedRename'
        static readonly label = 'Locked rename'
        static readonly input = lockedRenameInputSchema

        available(_design: Frozen<Design>): boolean {
          return false
        }

        apply(draft: Writable<Design>, input: LockedRenameInput): void {
          draft.meta.name = input.name
        }
      }
      const store = await arrange({ commands: [LockedRename], design: aDesign() })

      expect(() => store.run(LockedRename, { name: 'x', onDone: () => {} })).toThrow(
        expect.objectContaining({ name: 'DataCloneError' }),
      )
    })

    it('throws that a command is not registered before trying to copy its input', async () => {
      const store = await arrange()

      expect(() => store.run(LooseRename, { name: 'x', onDone: () => {} })).toThrow(
        new InvariantError('Command "meta.looseRename" is not registered.'),
      )
    })

    it('refuses with the rejection the apply step returns and discards its draft', async () => {
      const rejection: Rejection = { kind: 'stale', seq: 1, latest: 2 }
      const rejectRenameInputSchema = v.object({ name: v.string() })
      type RejectRenameInput = v.InferOutput<typeof rejectRenameInputSchema>

      class RejectRename implements Command<RejectRenameInput> {
        static readonly kind = 'command'
        static readonly id = 'meta.rejectRename'
        static readonly label = 'Reject rename'
        static readonly input = rejectRenameInputSchema

        available(_design: Frozen<Design>): boolean {
          return true
        }

        apply(draft: Writable<Design>, input: RejectRenameInput): Rejection {
          draft.meta.name = input.name
          return rejection
        }
      }
      const store = await arrange({ commands: [RejectRename], design: aDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(RejectRename, { name: 'discarded' })

      expectErr(result)
      expect(result.error).toBe(rejection)

      expectNothingCommitted(store, before, events)
    })

    it('refuses input the schema refuses, with plain issue paths', async () => {
      const store = await arrange({ commands: [RenameDesign], design: aDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(RenameDesign, { name: '' })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'input-invalid',
        command: 'meta.renameDesign',
        issues: [{ path: ['name'], message: expect.any(String) }],
      })

      expectNothingCommitted(store, before, events)
    })

    it.each([
      ['valid input', { board: 'mirrored' }],
      ['input its schema refuses', { board: 'tented' }],
    ])('refuses a command that is unavailable, given %s', async (_name, input) => {
      const setBoardInputSchema = v.object({
        board: v.pipe(v.string(), v.picklist(['reversible', 'mirrored'])),
      })
      type SetBoardInput = v.InferOutput<typeof setBoardInputSchema>

      class SetBoard implements Command<SetBoardInput> {
        static readonly kind = 'command'
        static readonly id = 'meta.setBoard'
        static readonly label = 'Set board'
        static readonly input = setBoardInputSchema

        available(design: Frozen<Design>): boolean {
          return design.meta.form.type === 'split'
        }

        apply(draft: Writable<Design>, input: SetBoardInput): void {
          draft.meta.form = { type: 'split', board: input.board }
        }
      }
      const store = await arrange({ commands: [SetBoard], design: unibodyDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(SetBoard, input)

      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: 'meta.setBoard' })

      expectNothingCommitted(store, before, events)
    })

    it('keeps the derived files, by reference, through a command', async () => {
      const store = await arrange({ commands: [RenameDesign], design: aDesign() })
      const before = committed(store)

      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))

      const after = committed(store)
      expect(after.routing).toBe(before.routing)
      expect(after.fingerprints).toBe(before.fingerprints)
    })

    it('throws on a command that is not registered', async () => {
      const store = await arrange()

      expect(() => store.run(RenameDesign, { name: 'Corne v2' })).toThrow(
        new InvariantError('Command "meta.renameDesign" is not registered.'),
      )
    })

    it('throws before any design is loaded', async () => {
      const store = await arrange({ commands: [RenameDesign] })

      expect(() => store.run(RenameDesign, { name: 'Corne v2' })).toThrow(InvariantError)
    })

    it('lets a throwing listener escape after the commit', async () => {
      const store = await arrange({ commands: [RenameDesign], design: aDesign() })
      const before = committed(store)
      store.events.on('commit', () => {
        throw new Error('listener failed')
      })

      expect(() => store.run(RenameDesign, { name: 'Corne v2' })).toThrow('listener failed')

      const design = { ...before.design, meta: { ...before.design.meta, name: 'Corne v2' } }
      expect(committed(store)).toEqual({
        design,
        ...emptyDerivedFilesAt(before.revision),
        seq: before.seq + 1,
        revision: hash(design),
      })
    })
  })

  describe('run, for an action', () => {
    it('runs with no design loaded and commits what it hands to replaceDesign', async () => {
      const store = await arrange({ actions: [LoadDesign] })
      const events = recordCommits(store)
      const value = aDesign()

      expectOk(await store.run(LoadDesign, { design: value }))

      expect(committed(store)).toEqual({
        design: value,
        ...emptyDerivedFilesAt(hash(value)),
        seq: 1,
        revision: hash(value),
      })
      expect(events).toEqual([{ kind: 'whole', committed: committed(store) }])
    })

    it('refuses input the schema refuses, with plain issue paths, without applying', async () => {
      const store = await arrange({ actions: [LoadDesign] })
      const events = recordCommits(store)

      const result = await store.run(LoadDesign, { design: null })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'input-invalid',
        command: 'file.loadDesign',
        issues: [{ path: ['design'], message: 'A design to load.' }],
      })
      expectNothingCommitted(store, Option.none(), events)
    })

    it.each([
      ['valid input', { fileName: 'corne.kdl' }],
      ['input its schema refuses', { fileName: '' }],
    ])(
      'refuses an action that is unavailable, given %s, without applying',
      async (_name, input) => {
        const saved: unknown[] = []
        const saveDesignInputSchema = v.object({ fileName: v.pipe(v.string(), v.minLength(1)) })
        type SaveDesignInput = v.InferOutput<typeof saveDesignInputSchema>

        class SaveDesign implements Action<SaveDesignInput, never> {
          static readonly kind = 'action'
          static readonly id = 'file.saveDesign'
          static readonly label = 'Save design'
          static readonly input = saveDesignInputSchema

          available(current: Option<Committed>): boolean {
            return current.isSome()
          }

          apply(input: SaveDesignInput): AsyncResult<void, never> {
            saved.push(input)
            return AsyncResult.ok()
          }
        }
        const store = await arrange({ actions: [SaveDesign] })

        const result = await store.run(SaveDesign, input)

        expectErr(result)
        expect(result.error).toEqual({ kind: 'unavailable', command: 'file.saveDesign' })
        expect(saved).toEqual([])
      },
    )

    it('gives the availability check no design before any load', async () => {
      const seen: Option<Committed>[] = []
      const startDesignInputSchema = v.object({})
      type StartDesignInput = v.InferOutput<typeof startDesignInputSchema>

      class StartDesign implements Action<StartDesignInput, never> {
        static readonly kind = 'action'
        static readonly id = 'file.startDesign'
        static readonly label = 'Start design'
        static readonly input = startDesignInputSchema

        available(current: Option<Committed>): boolean {
          seen.push(current)
          return current.isNone()
        }

        apply(_input: StartDesignInput): AsyncResult<void, never> {
          return AsyncResult.ok()
        }
      }
      const store = await arrange({ actions: [StartDesign] })

      expectOk(await store.run(StartDesign, {}))

      expect(seen).toEqual([Option.none()])
    })

    it('hands apply a copy of input its schema passes through', async () => {
      const received: unknown[] = []
      const RecordInput = recordInputAction(received)
      const store = await arrange({ actions: [RecordInput] })
      const input = { design: aDesign() }

      expectOk(await store.run(RecordInput, input))

      expect(received).toEqual([input])
      expect(received[0]).not.toBe(input)
    })

    it('throws on action input it cannot copy, without applying', async () => {
      const received: unknown[] = []
      const RecordInput = recordInputAction(received)
      const store = await arrange({ actions: [RecordInput] })

      expect(() => store.run(RecordInput, { name: 'x', onDone: () => {} })).toThrow(
        expect.objectContaining({ name: 'DataCloneError' }),
      )
      expect(received).toEqual([])
    })

    it('throws on an action that is not registered', async () => {
      const store = await arrange()

      expect(() => store.run(LoadDesign, { design: aDesign() })).toThrow(
        new InvariantError('Action "file.loadDesign" is not registered.'),
      )
    })
  })

  describe('entry instances', () => {
    it.each([
      ['no run', [], 0],
      ['one run', [{ name: 'Corne v2' }], 1],
      ['two runs', [{ name: 'Corne v2' }, { name: 'Corne v3' }], 1],
    ])('constructs a command lazily, once: %s', async (_name, inputs, expectedConstructed) => {
      let constructed = 0
      const nameDesignInputSchema = v.object({ name: v.string() })
      type NameDesignInput = v.InferOutput<typeof nameDesignInputSchema>

      class NameDesign implements Command<NameDesignInput> {
        static readonly kind = 'command'
        static readonly id = 'meta.nameDesign'
        static readonly label = 'Name design'
        static readonly input = nameDesignInputSchema

        constructor() {
          constructed += 1
        }

        available(_design: Frozen<Design>): boolean {
          return true
        }

        apply(draft: Writable<Design>, input: NameDesignInput): void {
          draft.meta.name = input.name
        }
      }
      const store = await arrange({ commands: [NameDesign], design: aDesign() })

      for (const input of inputs) store.run(NameDesign, input)

      expect(constructed).toBe(expectedConstructed)
    })

    it.each([
      ['no run', [], 0],
      ['one run', [{}], 1],
      ['two runs', [{}, {}], 1],
    ])('constructs an action lazily, once: %s', async (_name, inputs, expectedConstructed) => {
      let constructed = 0
      const openDesignInputSchema = v.object({})
      type OpenDesignInput = v.InferOutput<typeof openDesignInputSchema>

      class OpenDesign implements Action<OpenDesignInput, never> {
        static readonly kind = 'action'
        static readonly id = 'file.openDesign'
        static readonly label = 'Open design'
        static readonly input = openDesignInputSchema

        constructor() {
          constructed += 1
        }

        available(_current: Option<Committed>): boolean {
          return true
        }

        apply(_input: OpenDesignInput): AsyncResult<void, never> {
          return AsyncResult.ok()
        }
      }
      const store = await arrange({ actions: [OpenDesign] })

      for (const input of inputs) await store.run(OpenDesign, input)

      expect(constructed).toBe(expectedConstructed)
    })
  })

  describe('startup', () => {
    it('starts with a command and an action of distinct ids', async () => {
      await expect(
        arrange({ commands: [RenameDesign], actions: [LoadDesign] }),
      ).resolves.toBeInstanceOf(DesignStore)
    })

    it('refuses a command and an action with one id', async () => {
      const importDesignInputSchema = v.object({})
      type ImportDesignInput = v.InferOutput<typeof importDesignInputSchema>

      class ImportDesign implements Action<ImportDesignInput, never> {
        static readonly kind = 'action'
        static readonly id = 'meta.renameDesign'
        static readonly label = 'Import design'
        static readonly input = importDesignInputSchema

        available(_current: Option<Committed>): boolean {
          return true
        }

        apply(_input: ImportDesignInput): AsyncResult<void, never> {
          return AsyncResult.ok()
        }
      }

      await expect(arrange({ commands: [RenameDesign], actions: [ImportDesign] })).rejects.toThrow(
        new DuplicateCommandIdError(['meta.renameDesign']),
      )
    })

    it('refuses two commands with one id', async () => {
      const retitleDesignInputSchema = v.object({ title: v.string() })
      type RetitleDesignInput = v.InferOutput<typeof retitleDesignInputSchema>

      class RetitleDesign implements Command<RetitleDesignInput> {
        static readonly kind = 'command'
        static readonly id = 'meta.renameDesign'
        static readonly label = 'Retitle design'
        static readonly input = retitleDesignInputSchema

        available(_design: Frozen<Design>): boolean {
          return true
        }

        apply(draft: Writable<Design>, input: RetitleDesignInput): void {
          draft.meta.name = input.title
        }
      }

      await expect(arrange({ commands: [RenameDesign, RetitleDesign] })).rejects.toThrow(
        new DuplicateCommandIdError(['meta.renameDesign']),
      )
    })
  })

  describe('replaceDesign', () => {
    it("commits the design deeply frozen at the first seq with its revision, never freezing the caller's value", async () => {
      const store = await arrange()
      const design = aDesign()

      expectOk(store.replaceDesign({ design, unreadable: [] }))

      expect(committed(store)).toEqual({
        design,
        ...emptyDerivedFilesAt(hash(design)),
        seq: 1,
        revision: hash(design),
      })
      expectDeeplyFrozen(committed(store).design)
      expectNothingFrozen(design)
    })

    it('advances the seq from the design it replaces', async () => {
      const store = await arrange({ design: aDesign() })
      const before = committed(store)
      const design = aDesign({ meta: aMeta({ name: 'Corne v2' }) })

      expectOk(store.replaceDesign({ design, unreadable: [] }))

      expect(committed(store)).toEqual({
        design,
        ...emptyDerivedFilesAt(hash(design)),
        seq: before.seq + 1,
        revision: hash(design),
      })
    })

    it('emits one whole commit event carrying what it committed', async () => {
      const store = await arrange()
      const events = recordCommits(store)

      expectOk(store.replaceDesign({ design: aDesign(), unreadable: [] }))

      expect(events).toEqual([{ kind: 'whole', committed: committed(store) }])
    })

    it('keeps valid derived files as read, at another revision too, emptying none', async () => {
      const store = await arrange()
      const routing = { revision: 'older' }
      const fingerprints = {
        revision: 'older',
        fingerprints: [{ id: 'choc-key', slice: 'slice-hash', outputs: 'outputs-hash' }],
      }

      const result = store.replaceDesign({
        design: aDesign(),
        routing,
        fingerprints,
        unreadable: [],
      })

      expectOk(result)
      expect(result.value).toEqual({ emptied: [] })
      expect(committed(store)).toEqual({
        design: aDesign(),
        routing,
        fingerprints,
        seq: 1,
        revision: hash(aDesign()),
      })
    })

    it("deep-freezes the derived files it keeps, never the caller's", async () => {
      const store = await arrange()
      const routing = aRoutingFile()
      const fingerprints = aFingerprintsFile()

      expectOk(store.replaceDesign({ design: aDesign(), routing, fingerprints, unreadable: [] }))

      expectDeeplyFrozen(committed(store).routing)
      expectDeeplyFrozen(committed(store).fingerprints)
      expectNothingFrozen(routing)
      expectNothingFrozen(fingerprints)
    })

    it.each([
      [
        'routing that fails its schema',
        { routing: { revision: 3 }, fingerprints: { revision: 'older', fingerprints: [] } },
        [{ file: 'routing', reason: 'invalid' }],
        (revision: string) => ({
          routing: { revision },
          fingerprints: { revision: 'older', fingerprints: [] },
        }),
      ],
      [
        'fingerprints with a field their schema does not define',
        {
          routing: { revision: 'older' },
          fingerprints: { revision: 'older', fingerprints: [], colour: 'red' },
        },
        [{ file: 'fingerprints', reason: 'invalid' }],
        (revision: string) => ({
          routing: { revision: 'older' },
          fingerprints: { revision, fingerprints: [] },
        }),
      ],
      [
        'routing listed as unreadable',
        { fingerprints: { revision: 'older', fingerprints: [] }, unreadable: ['routing' as const] },
        [{ file: 'routing', reason: 'unreadable' }],
        (revision: string) => ({
          routing: { revision },
          fingerprints: { revision: 'older', fingerprints: [] },
        }),
      ],
      [
        'both derived files, missing',
        {},
        [
          { file: 'routing', reason: 'missing' },
          { file: 'fingerprints', reason: 'missing' },
        ],
        (revision: string) => ({
          routing: { revision },
          fingerprints: { revision, fingerprints: [] },
        }),
      ],
    ])(
      'empties %s at the new revision, saying which and why',
      async (_role, files, expectedEmptied, expectedFiles) => {
        const store = await arrange()
        const design = aDesign()

        const result = store.replaceDesign({ design, unreadable: [], ...files })

        expectOk(result)
        expect(result.value).toEqual({ emptied: expectedEmptied })
        expect(committed(store)).toEqual({
          design,
          ...expectedFiles(hash(design)),
          seq: 1,
          revision: hash(design),
        })
      },
    )

    it('refuses a design that fails its schema, at the path from the design root, committing nothing', async () => {
      const store = await arrange()
      const before = store.current
      const events = recordCommits(store)
      const design = { ...aDesign(), meta: { ...aMeta(), id: 'Corne' } }

      const result = store.replaceDesign({ design, unreadable: [] })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'design-invalid',
        issues: [{ path: ['meta', 'id'], message: expect.any(String) }],
      })

      expectNothingCommitted(store, before, events)
    })
  })
  describe('acceptDerivedFiles', () => {
    it('replaces the derived files at the current seq, frozen, keeping the seq and revision', async () => {
      const store = await arrange({ design: aDesign() })
      const before = committed(store)
      const files = acceptedFiles()

      store.acceptDerivedFiles(files, before.seq)

      expect(committed(store)).toEqual({
        design: before.design,
        ...acceptedFiles(),
        seq: before.seq,
        revision: before.revision,
      })
      expectDeeplyFrozen(committed(store).routing)
      expectDeeplyFrozen(committed(store).fingerprints)
    })

    it('emits one accept event carrying what it committed, and no commit event', async () => {
      const store = await arrange({ design: aDesign() })
      const commits = recordCommits(store)
      const accepted = recordAccepts(store)

      store.acceptDerivedFiles(acceptedFiles(), committed(store).seq)

      expect({ accepted, commits }).toEqual({ accepted: [committed(store)], commits: [] })
    })

    it.each([
      ['one below the current seq', -1],
      ['one above the current seq', 1],
    ])('drops files %s, emitting nothing', async (_role, offset) => {
      const store = await arrange({ design: aDesign(), commands: [RenameDesign] })
      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))
      const before = store.current
      const accepted = recordAccepts(store)

      store.acceptDerivedFiles(acceptedFiles(), committed(store).seq + offset)

      expect(store.current.getOrUndefined()).toBe(before.getOrUndefined())
      expect(accepted).toEqual([])
    })

    it('throws with nothing committed', async () => {
      const store = await arrange()

      expect(() => store.acceptDerivedFiles(acceptedFiles(), 1)).toThrow(InvariantError)
    })
  })
})
