import { Container, inject } from '@keeb-cad/di'
import { hash } from '@keeb-cad/hashing'
import { reactive } from '@keeb-cad/reactive'
import { AsyncResult, InvariantError, Option } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { type Design, type DesignInvalid, formSchema, type Rejection } from '@keeb-cad/schema'
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

class Rename implements Command<v.InferOutput<typeof Rename.input>> {
  static readonly kind = 'command'
  static readonly id = 'test.rename'
  static readonly label = 'Rename'
  static readonly input = v.object({ name: v.pipe(v.string(), v.minLength(1)) })

  available(): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: v.InferOutput<typeof Rename.input>): void {
    draft.meta.name = input.name
  }
}

class SetForm implements Command<v.InferOutput<typeof SetForm.input>> {
  static readonly kind = 'command'
  static readonly id = 'test.setForm'
  static readonly label = 'Set form'
  static readonly input = v.object({ form: formSchema })

  available(): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: v.InferOutput<typeof SetForm.input>): void {
    draft.meta.form = input.form
  }
}

class Load implements Action<v.InferOutput<typeof Load.input>, DesignInvalid> {
  static readonly kind = 'action'
  static readonly id = 'test.load'
  static readonly label = 'Load'
  static readonly input = v.object({
    design: v.pipe(
      v.unknown(),
      v.check((value) => value !== null, 'A design to load.'),
    ),
  })

  readonly #store = inject(DesignStore)

  available(): boolean {
    return true
  }

  apply(input: v.InferOutput<typeof Load.input>): AsyncResult<void, DesignInvalid> {
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

function entryCommand(id: string): CommandHandle {
  return class implements Command<v.InferOutput<typeof Rename.input>> {
    static readonly kind = 'command'
    static readonly id = id
    static readonly label = 'Command'
    static readonly input = Rename.input

    available(): boolean {
      return true
    }

    apply(_draft: Writable<Design>, _input: v.InferOutput<typeof Rename.input>): void {}
  }
}

function entryAction(id: string): ActionHandle {
  return class implements Action<v.InferOutput<typeof Rename.input>, never> {
    static readonly kind = 'action'
    static readonly id = id
    static readonly label = 'Action'
    static readonly input = Rename.input

    available(): boolean {
      return true
    }

    apply(_input: v.InferOutput<typeof Rename.input>): AsyncResult<void, never> {
      return AsyncResult.ok()
    }
  }
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
      const store = await arrange({ commands: [Rename], design: metaOnlyDesign() })
      const before = committed(store)
      const events = recordCommits(store)

      expectOk(store.run(Rename, { name: 'Corne v2' }))

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
      class Refuse implements Command<v.InferOutput<typeof Rename.input>> {
        static readonly kind = 'command'
        static readonly id = 'test.refuse'
        static readonly label = 'Refuse'
        static readonly input = Rename.input

        available(): boolean {
          return true
        }

        apply(draft: Writable<Design>, input: v.InferOutput<typeof Rename.input>): Rejection {
          draft.meta.name = input.name
          return rejection
        }
      }
      const store = await arrange({ commands: [Refuse], design: metaOnlyDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(Refuse, { name: 'discarded' })

      expectErr(result)
      expect(result.error).toBe(rejection)

      expectNothingCommitted(store, before, events)
    })

    it('refuses input the schema refuses, with plain issue paths', async () => {
      const store = await arrange({ commands: [Rename], design: metaOnlyDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(Rename, { name: '' })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'input-invalid',
        command: 'test.rename',
        issues: [{ path: ['name'], message: expect.any(String) }],
      })

      expectNothingCommitted(store, before, events)
    })

    it.each([
      ['valid input', { name: 'discarded' }],
      ['input its schema refuses', { name: '' }],
    ])('refuses a command that is unavailable, given %s', async (_name, input) => {
      class Locked implements Command<v.InferOutput<typeof Rename.input>> {
        static readonly kind = 'command'
        static readonly id = 'test.locked'
        static readonly label = 'Locked'
        static readonly input = Rename.input

        available(): boolean {
          return false
        }

        apply(draft: Writable<Design>, input: v.InferOutput<typeof Rename.input>): void {
          draft.meta.name = input.name
        }
      }
      const store = await arrange({ commands: [Locked], design: metaOnlyDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(Locked, input)

      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: 'test.locked' })

      expectNothingCommitted(store, before, events)
    })

    it('throws on a command that is not registered', async () => {
      const store = await arrange({ design: metaOnlyDesign() })

      expect(() => store.run(Rename, { name: 'Corne v2' })).toThrow(
        new InvariantError('Command "test.rename" is not registered.'),
      )
    })

    it('throws before any design is loaded', async () => {
      const store = await arrange({ commands: [Rename] })

      expect(() => store.run(Rename, { name: 'Corne v2' })).toThrow(InvariantError)
    })

    it('lets a throwing listener escape after the commit', async () => {
      const store = await arrange({ commands: [Rename], design: metaOnlyDesign() })
      const before = committed(store)
      store.events.on('commit', () => {
        throw new Error('listener failed')
      })

      expect(() => store.run(Rename, { name: 'Corne v2' })).toThrow('listener failed')

      const design = { meta: { ...before.design.meta, name: 'Corne v2' } }
      expect(store.current).toEqual(
        Option.some({ design, seq: before.seq + 1, revision: hash(design) }),
      )
    })
  })

  describe('run, for an action', () => {
    it('runs with no design loaded and commits what it hands to replaceDesign', async () => {
      const store = await arrange({ actions: [Load] })
      const events = recordCommits(store)
      const value = metaOnlyDesign()

      expectOk(await store.run(Load, { design: value }))

      const after = { design: value, seq: 1, revision: hash(value) }
      expect(store.current).toEqual(Option.some(after))
      expect(events).toEqual([{ kind: 'whole', ...after }])
    })

    it('refuses input the schema refuses, with plain issue paths, without applying', async () => {
      const store = await arrange({ actions: [Load] })
      const events = recordCommits(store)

      const result = await store.run(Load, { design: null })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'input-invalid',
        command: 'test.load',
        issues: [{ path: ['design'], message: 'A design to load.' }],
      })
      expectNothingCommitted(store, Option.none(), events)
    })

    it.each([
      ['valid input', { name: 'Corne v2' }],
      ['input its schema refuses', { name: '' }],
    ])(
      'refuses an action that is unavailable, given %s, without applying',
      async (_name, input) => {
        const applied: unknown[] = []
        class Closed implements Action<v.InferOutput<typeof Rename.input>, never> {
          static readonly kind = 'action'
          static readonly id = 'test.closed'
          static readonly label = 'Closed'
          static readonly input = Rename.input

          available(): boolean {
            return false
          }

          apply(input: v.InferOutput<typeof Rename.input>): AsyncResult<void, never> {
            applied.push(input)
            return AsyncResult.ok()
          }
        }
        const store = await arrange({ actions: [Closed] })

        const result = await store.run(Closed, input)

        expectErr(result)
        expect(result.error).toEqual({ kind: 'unavailable', command: 'test.closed' })
        expect(applied).toEqual([])
      },
    )

    it('gives the availability check no design before any load', async () => {
      const seen: Option<Committed>[] = []
      class Probe implements Action<v.InferOutput<typeof Probe.input>, never> {
        static readonly kind = 'action'
        static readonly id = 'test.probe'
        static readonly label = 'Probe'
        static readonly input = v.object({})

        available(current: Option<Committed>): boolean {
          seen.push(current)
          return true
        }

        apply(_input: v.InferOutput<typeof Probe.input>): AsyncResult<void, never> {
          return AsyncResult.ok()
        }
      }
      const store = await arrange({ actions: [Probe] })

      expectOk(await store.run(Probe, {}))

      expect(seen).toEqual([Option.none()])
    })

    it('throws on an action that is not registered', async () => {
      const store = await arrange()

      expect(() => store.run(Load, { design: metaOnlyDesign() })).toThrow(
        new InvariantError('Action "test.load" is not registered.'),
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
      class Counted implements Command<v.InferOutput<typeof Rename.input>> {
        static readonly kind = 'command'
        static readonly id = 'test.counted'
        static readonly label = 'Counted'
        static readonly input = Rename.input

        constructor() {
          constructed += 1
        }

        available(): boolean {
          return true
        }

        apply(draft: Writable<Design>, input: v.InferOutput<typeof Rename.input>): void {
          draft.meta.name = input.name
        }
      }
      const store = await arrange({ commands: [Counted], design: metaOnlyDesign() })

      for (const input of inputs) store.run(Counted, input)

      expect(constructed).toBe(expectedConstructed)
    })

    it.each([
      ['no run', [], 0],
      ['one run', [{}], 1],
      ['two runs', [{}, {}], 1],
    ])('constructs an action lazily, once: %s', async (_name, inputs, expectedConstructed) => {
      let constructed = 0
      class Counted implements Action<v.InferOutput<typeof Counted.input>, never> {
        static readonly kind = 'action'
        static readonly id = 'test.counted'
        static readonly label = 'Counted'
        static readonly input = v.object({})

        constructor() {
          constructed += 1
        }

        available(): boolean {
          return true
        }

        apply(_input: v.InferOutput<typeof Counted.input>): AsyncResult<void, never> {
          return AsyncResult.ok()
        }
      }
      const store = await arrange({ actions: [Counted] })

      for (const input of inputs) await store.run(Counted, input)

      expect(constructed).toBe(expectedConstructed)
    })
  })

  describe('startup', () => {
    it('starts with a command and an action of distinct ids', async () => {
      await expect(
        arrange({ commands: [entryCommand('test.a')], actions: [entryAction('test.b')] }),
      ).resolves.toBeInstanceOf(DesignStore)
    })

    it('refuses a command and an action with one id', async () => {
      await expect(
        arrange({ commands: [entryCommand('test.a')], actions: [entryAction('test.a')] }),
      ).rejects.toThrow(new DuplicateCommandIdError(['test.a']))
    })

    it('refuses two commands with one id', async () => {
      await expect(
        arrange({ commands: [entryCommand('test.a'), entryCommand('test.a')] }),
      ).rejects.toThrow(new DuplicateCommandIdError(['test.a']))
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
