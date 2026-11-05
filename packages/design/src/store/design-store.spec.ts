import { Container, inject } from '@keeb-cad/di'
import { hash } from '@keeb-cad/hashing'
import { reactive } from '@keeb-cad/reactive'
import { AsyncResult, InvariantError, Option } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import {
  type Design,
  type DesignInvalid,
  formSchema,
  type Frozen,
  type Rejection,
} from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designModule } from '../design-module'
import { registerAction } from '../entries/register-action'
import { registerCommand } from '../entries/register-command'
import type { Action, ActionHandle, Command, CommandHandle } from '../entries/types'
import type { Writable } from '../patching/types'
import { expectDeeplyFrozen, expectNothingFrozen, metaOnlyDesign } from '../testing'
import { DesignStore } from './design-store'
import { DuplicateCommandIdError } from './duplicate-command-id-error'
import type { Committed, CommitEvent } from './types'

// Unlike a real command, which forwards to one model operation, a test command edits the draft
// itself, so the store's tests need no domain.
class RenameDesign implements Command<v.InferOutput<typeof RenameDesign.input>> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = v.object({ name: v.pipe(v.string(), v.minLength(1)) })

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: v.InferOutput<typeof RenameDesign.input>): void {
    draft.meta.name = input.name
  }
}

class SetForm implements Command<v.InferOutput<typeof SetForm.input>> {
  static readonly kind = 'command'
  static readonly id = 'meta.setForm'
  static readonly label = 'Set form'
  static readonly input = v.object({ form: formSchema })

  available(_design: Frozen<Design>): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: v.InferOutput<typeof SetForm.input>): void {
    draft.meta.form = input.form
  }
}

class LoadDesign implements Action<v.InferOutput<typeof LoadDesign.input>, DesignInvalid> {
  static readonly kind = 'action'
  static readonly id = 'file.loadDesign'
  static readonly label = 'Load design'
  static readonly input = v.object({
    design: v.pipe(
      v.unknown(),
      v.check((value) => value !== null, 'A design to load.'),
    ),
  })

  readonly #store = inject(DesignStore)

  available(_current: Option<Committed>): boolean {
    return true
  }

  apply(input: v.InferOutput<typeof LoadDesign.input>): AsyncResult<void, DesignInvalid> {
    return AsyncResult.fromResult(this.#store.replaceDesign(input.design))
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
  if (arrangement.design !== undefined) expectOk(store.replaceDesign(arrangement.design))
  return store
}

function unibodyDesign() {
  return { meta: { ...metaOnlyDesign().meta, form: { type: 'unibody' } } }
}

function recordCommits(store: DesignStore): CommitEvent[] {
  const events: CommitEvent[] = []
  store.events.on('commit', (event) => events.push(event))
  return events
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
      const store = await arrange({ commands: [RenameDesign], design: metaOnlyDesign() })
      const before = committed(store)
      const events = recordCommits(store)

      expectOk(store.run(RenameDesign, { name: 'Corne v2' }))

      const design = { meta: { ...before.design.meta, name: 'Corne v2' } }
      const after = { design, seq: before.seq + 1, revision: hash(design) }
      expect(store.current).toEqual(Option.some(after))
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
      const store = await arrange({ commands: [SetForm], design: metaOnlyDesign() })
      const before = committed(store)
      const input = makeInput()

      expectOk(store.run(SetForm, input))

      const design = { meta: { ...before.design.meta, form: { type: 'unibody' } } }
      expect(store.current).toEqual(
        Option.some({ design, seq: before.seq + 1, revision: hash(design) }),
      )
      expectDeeplyFrozen(committed(store).design)
      expectNothingFrozen(input)
    })

    it('refuses with the rejection the apply step returns and discards its draft', async () => {
      const rejection: Rejection = { kind: 'stale', seq: 1, latest: 2 }
      class RejectRename implements Command<v.InferOutput<typeof RejectRename.input>> {
        static readonly kind = 'command'
        static readonly id = 'meta.rejectRename'
        static readonly label = 'Reject rename'
        static readonly input = v.object({ name: v.string() })

        available(_design: Frozen<Design>): boolean {
          return true
        }

        apply(draft: Writable<Design>, input: v.InferOutput<typeof RejectRename.input>): Rejection {
          draft.meta.name = input.name
          return rejection
        }
      }
      const store = await arrange({ commands: [RejectRename], design: metaOnlyDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(RejectRename, { name: 'discarded' })

      expectErr(result)
      expect(result.error).toBe(rejection)

      expectNothingCommitted(store, before, events)
    })

    it('refuses input the schema refuses, with plain issue paths', async () => {
      const store = await arrange({ commands: [RenameDesign], design: metaOnlyDesign() })
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
      class SetBoard implements Command<v.InferOutput<typeof SetBoard.input>> {
        static readonly kind = 'command'
        static readonly id = 'meta.setBoard'
        static readonly label = 'Set board'
        static readonly input = v.object({
          board: v.pipe(v.string(), v.picklist(['reversible', 'mirrored'])),
        })

        available(design: Frozen<Design>): boolean {
          return design.meta.form.type === 'split'
        }

        apply(draft: Writable<Design>, input: v.InferOutput<typeof SetBoard.input>): void {
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

    it('throws on a command that is not registered', async () => {
      const store = await arrange({ design: metaOnlyDesign() })

      expect(() => store.run(RenameDesign, { name: 'Corne v2' })).toThrow(
        new InvariantError('Command "meta.renameDesign" is not registered.'),
      )
    })

    it('throws before any design is loaded', async () => {
      const store = await arrange({ commands: [RenameDesign] })

      expect(() => store.run(RenameDesign, { name: 'Corne v2' })).toThrow(InvariantError)
    })

    it('lets a throwing listener escape after the commit', async () => {
      const store = await arrange({ commands: [RenameDesign], design: metaOnlyDesign() })
      const before = committed(store)
      store.events.on('commit', () => {
        throw new Error('listener failed')
      })

      expect(() => store.run(RenameDesign, { name: 'Corne v2' })).toThrow('listener failed')

      const design = { meta: { ...before.design.meta, name: 'Corne v2' } }
      expect(store.current).toEqual(
        Option.some({ design, seq: before.seq + 1, revision: hash(design) }),
      )
    })
  })

  describe('run, for an action', () => {
    it('runs with no design loaded and commits what it hands to replaceDesign', async () => {
      const store = await arrange({ actions: [LoadDesign] })
      const events = recordCommits(store)
      const value = metaOnlyDesign()

      expectOk(await store.run(LoadDesign, { design: value }))

      const after = { design: value, seq: 1, revision: hash(value) }
      expect(store.current).toEqual(Option.some(after))
      expect(events).toEqual([{ kind: 'whole', ...after }])
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
        class SaveDesign implements Action<v.InferOutput<typeof SaveDesign.input>, never> {
          static readonly kind = 'action'
          static readonly id = 'file.saveDesign'
          static readonly label = 'Save design'
          static readonly input = v.object({ fileName: v.pipe(v.string(), v.minLength(1)) })

          available(current: Option<Committed>): boolean {
            return current.isSome()
          }

          apply(input: v.InferOutput<typeof SaveDesign.input>): AsyncResult<void, never> {
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
      class StartDesign implements Action<v.InferOutput<typeof StartDesign.input>, never> {
        static readonly kind = 'action'
        static readonly id = 'file.startDesign'
        static readonly label = 'Start design'
        static readonly input = v.object({})

        available(current: Option<Committed>): boolean {
          seen.push(current)
          return current.isNone()
        }

        apply(_input: v.InferOutput<typeof StartDesign.input>): AsyncResult<void, never> {
          return AsyncResult.ok()
        }
      }
      const store = await arrange({ actions: [StartDesign] })

      expectOk(await store.run(StartDesign, {}))

      expect(seen).toEqual([Option.none()])
    })

    it('throws on an action that is not registered', async () => {
      const store = await arrange()

      expect(() => store.run(LoadDesign, { design: metaOnlyDesign() })).toThrow(
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
      class NameDesign implements Command<v.InferOutput<typeof NameDesign.input>> {
        static readonly kind = 'command'
        static readonly id = 'meta.nameDesign'
        static readonly label = 'Name design'
        static readonly input = v.object({ name: v.string() })

        constructor() {
          constructed += 1
        }

        available(_design: Frozen<Design>): boolean {
          return true
        }

        apply(draft: Writable<Design>, input: v.InferOutput<typeof NameDesign.input>): void {
          draft.meta.name = input.name
        }
      }
      const store = await arrange({ commands: [NameDesign], design: metaOnlyDesign() })

      for (const input of inputs) store.run(NameDesign, input)

      expect(constructed).toBe(expectedConstructed)
    })

    it.each([
      ['no run', [], 0],
      ['one run', [{}], 1],
      ['two runs', [{}, {}], 1],
    ])('constructs an action lazily, once: %s', async (_name, inputs, expectedConstructed) => {
      let constructed = 0
      class OpenDesign implements Action<v.InferOutput<typeof OpenDesign.input>, never> {
        static readonly kind = 'action'
        static readonly id = 'file.openDesign'
        static readonly label = 'Open design'
        static readonly input = v.object({})

        constructor() {
          constructed += 1
        }

        available(_current: Option<Committed>): boolean {
          return true
        }

        apply(_input: v.InferOutput<typeof OpenDesign.input>): AsyncResult<void, never> {
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
      class ImportDesign implements Action<v.InferOutput<typeof ImportDesign.input>, never> {
        static readonly kind = 'action'
        static readonly id = 'meta.renameDesign'
        static readonly label = 'Import design'
        static readonly input = v.object({})

        available(_current: Option<Committed>): boolean {
          return true
        }

        apply(_input: v.InferOutput<typeof ImportDesign.input>): AsyncResult<void, never> {
          return AsyncResult.ok()
        }
      }

      await expect(arrange({ commands: [RenameDesign], actions: [ImportDesign] })).rejects.toThrow(
        new DuplicateCommandIdError(['meta.renameDesign']),
      )
    })

    it('refuses two commands with one id', async () => {
      class RetitleDesign implements Command<v.InferOutput<typeof RetitleDesign.input>> {
        static readonly kind = 'command'
        static readonly id = 'meta.renameDesign'
        static readonly label = 'Retitle design'
        static readonly input = v.object({ title: v.string() })

        available(_design: Frozen<Design>): boolean {
          return true
        }

        apply(draft: Writable<Design>, input: v.InferOutput<typeof RetitleDesign.input>): void {
          draft.meta.name = input.title
        }
      }

      await expect(arrange({ commands: [RenameDesign, RetitleDesign] })).rejects.toThrow(
        new DuplicateCommandIdError(['meta.renameDesign']),
      )
    })
  })

  describe('replaceDesign', () => {
    it('loads a valid design deeply frozen, with the next seq and its revision', async () => {
      const store = await arrange()
      const events = recordCommits(store)
      const value = metaOnlyDesign()

      expectOk(store.replaceDesign(value))

      const after = { design: value, seq: 1, revision: hash(value) }
      expect(store.current).toEqual(Option.some(after))
      expectDeeplyFrozen(committed(store).design)
      expectNothingFrozen(value)
      expect(events).toEqual([{ kind: 'whole', ...after }])
    })

    it('advances the seq from the design it replaces', async () => {
      const store = await arrange({ design: metaOnlyDesign() })
      const before = committed(store)
      const value = { meta: { ...metaOnlyDesign().meta, name: 'Corne v2' } }

      expectOk(store.replaceDesign(value))

      expect(store.current).toEqual(
        Option.some({ design: value, seq: before.seq + 1, revision: hash(value) }),
      )
    })

    it('refuses an invalid design with its issue paths', async () => {
      const store = await arrange()
      const before = store.current
      const events = recordCommits(store)
      const value = metaOnlyDesign()
      value.meta.form.type = 'tented'

      const result = store.replaceDesign(value)

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'design-invalid',
        issues: [{ path: ['meta', 'form', 'type'], message: expect.any(String) }],
      })

      expectNothingCommitted(store, before, events)
    })
  })
})
