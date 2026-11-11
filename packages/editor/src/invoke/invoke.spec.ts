import {
  type Action,
  type ActionHandle,
  type Command,
  type CommandHandle,
  DesignStore,
  designModule,
  registerAction,
  registerCommand,
  type Writable,
} from '@keeb-cad/design'
import { Container, inject } from '@keeb-cad/di'
import { AsyncResult, Option, Result } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Design, Rejection } from '@keeb-cad/schema'
import { aDesign, aMeta, anId } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it, onTestFinished } from 'vitest'
import { nextTick } from 'vue'

import { editorModule } from '../editor-module'
import { Recorder } from '../testing/recorder'
import { registerUiAction } from '../ui-actions/register-ui-action'
import type { UiAction, UiActionHandle } from '../ui-actions/types'
import { DuplicateInputBuilderError } from './duplicate-input-builder-error'
import { Invoke } from './invoke'
import { registerInputBuilder } from './register-input-builder'
import type { EntryHandle, InputBuilder, InvokeEvent } from './types'

const nameInputSchema = v.object({ name: v.pipe(v.string(), v.minLength(1)) })
type NameInput = v.InferOutput<typeof nameInputSchema>

class RenameDesign implements Command<NameInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = nameInputSchema

  available(): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, input: NameInput): void {
    draft.meta.name = input.name
  }
}

// With no rejection its check says ok.
function renameWith(rejection?: Rejection) {
  return class RenameWith implements Command<NameInput> {
    static readonly kind = 'command'
    static readonly id = 'meta.renameWith'
    static readonly label = 'Rename with'
    static readonly input = nameInputSchema

    available(): Result<void, Rejection> {
      return rejection === undefined ? Result.ok() : Result.err(rejection)
    }

    apply(draft: Writable<Design>, input: NameInput): void {
      draft.meta.name = input.name
    }
  }
}

function recordAction(id: string, available: boolean) {
  return class RecordAction implements Action<NameInput, never> {
    static readonly kind = 'action'
    static readonly id = id
    static readonly label = 'Record action'
    static readonly input = nameInputSchema

    available(): boolean {
      return available
    }

    apply(input: NameInput): AsyncResult<void, never> {
      this.#recorder.recorded.push(input)
      return AsyncResult.ok()
    }

    readonly #recorder = inject(Recorder)
  }
}

const nullableNameInputSchema = v.nullable(nameInputSchema)
type NullableNameInput = v.InferOutput<typeof nullableNameInputSchema>

function recordNullableName() {
  return class RecordNullableName implements UiAction<NullableNameInput> {
    static readonly kind = 'ui-action'
    static readonly id = 'test.recordNullableName'
    static readonly label = 'Record nullable name'
    static readonly input = nullableNameInputSchema

    available(): boolean {
      return true
    }

    apply(input: NullableNameInput): AsyncResult<void, Rejection> {
      this.#recorder.recorded.push(input)
      return AsyncResult.ok()
    }

    readonly #recorder = inject(Recorder)
  }
}

function recordName(id: string, available: boolean) {
  return class RecordName implements UiAction<NameInput> {
    static readonly kind = 'ui-action'
    static readonly id = id
    static readonly label = 'Record name'
    static readonly input = nameInputSchema

    available(): boolean {
      return available
    }

    apply(input: NameInput): AsyncResult<void, Rejection> {
      this.#recorder.recorded.push(input)
      return AsyncResult.ok()
    }

    readonly #recorder = inject(Recorder)
  }
}

function buildName(name: string): new () => InputBuilder<NameInput> {
  return class BuildName implements InputBuilder<NameInput> {
    input(): NameInput {
      return { name }
    }
  }
}

class RecordedBuildName implements InputBuilder<NameInput> {
  input(): NameInput {
    const input = { name: 'Corne' }
    this.#recorder.recorded.push(input)
    return input
  }

  readonly #recorder = inject(Recorder)
}

interface Entries {
  commands?: readonly CommandHandle[]
  actions?: readonly ActionHandle[]
  uiActions?: readonly UiActionHandle[]
  builders?: readonly (readonly [EntryHandle, new () => InputBuilder<unknown>])[]
  design?: Design
}

interface Arrangement extends Entries {
  recorder?: Recorder
}

async function arrange({
  commands = [],
  actions = [],
  uiActions = [],
  builders = [],
  design,
  recorder,
}: Arrangement) {
  const container = new Container().addModule(designModule).addModule(editorModule)
  if (recorder !== undefined) container.register(Recorder).useValue(recorder)
  for (const handle of commands) registerCommand(container, handle)
  for (const handle of actions) registerAction(container, handle)
  for (const handle of uiActions) registerUiAction(container, handle)
  for (const [handle, builder] of builders) registerInputBuilder(container, handle, builder)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  if (design !== undefined) expectOk(store.replaceDesign({ design, unreadable: [] }))
  return { invoke: container.resolve(Invoke), store }
}

function nameOf(store: DesignStore): Option<string> {
  return store.current.map((committed) => committed.design.meta.name)
}

function expectUnavailable(result: Result<unknown, unknown>, command: string): void {
  expectErr(result)
  expect(result.error).toEqual({ kind: 'unavailable', command })
}

describe('Invoke', () => {
  describe('invoke', () => {
    it('says a command is unavailable before any design is committed, and refuses it as such', async () => {
      const { invoke, store } = await arrange({ commands: [RenameDesign] })

      const available = invoke.available(RenameDesign)
      const result = await invoke.invoke(RenameDesign)

      expect(available).toBe(false)
      expectUnavailable(result, RenameDesign.id)
      expect(store.current).toEqual(Option.none())
    })

    it("runs a command with the caller's input without asking its builder", async () => {
      const recorder = new Recorder()
      const { invoke, store } = await arrange({
        commands: [RenameDesign],
        builders: [[RenameDesign, RecordedBuildName]],
        design: aDesign(),
        recorder,
      })

      expectOk(await invoke.invoke(RenameDesign, { name: 'Lily58' }))

      expect(nameOf(store)).toEqual(Option.some('Lily58'))
      expect(recorder.recorded).toEqual([])
    })

    it.each([
      ['no input argument', (invoke: Invoke) => invoke.invoke(RenameDesign)],
      ['undefined input', (invoke: Invoke) => invoke.invoke(RenameDesign, undefined)],
    ])("runs a command with its builder's input, given %s", async (_name, act) => {
      const { invoke, store } = await arrange({
        commands: [RenameDesign],
        builders: [[RenameDesign, buildName('Corne')]],
        design: aDesign({ meta: aMeta({ name: 'Lily58' }) }),
      })

      expectOk(await act(invoke))

      expect(nameOf(store)).toEqual(Option.some('Corne'))
    })

    it('refuses an action its check says no to as unavailable, having asked its builder first', async () => {
      const action = recordAction('test.recordAction', false)
      const recorder = new Recorder()
      const { invoke } = await arrange({
        actions: [action],
        builders: [[action, RecordedBuildName]],
        recorder,
      })

      const result = await invoke.invoke(action)

      expectUnavailable(result, 'test.recordAction')
      expect(recorder.recorded).toEqual([{ name: 'Corne' }])
    })

    it('refuses a UiAction its check says no to as unavailable, having asked its builder first', async () => {
      const uiAction = recordName('test.recordName', false)
      const recorder = new Recorder()
      const { invoke } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, RecordedBuildName]],
        recorder,
      })

      const result = await invoke.invoke(uiAction)

      expectUnavailable(result, 'test.recordName')
      expect(recorder.recorded).toEqual([{ name: 'Corne' }])
    })

    it("refuses a command with its check's own rejection, not as unavailable", async () => {
      const command = renameWith({
        kind: 'root-required',
        ids: [anId('root')],
        message: 'The root group "root" can\'t be deleted.',
      })
      const { invoke, store } = await arrange({ commands: [command], design: aDesign() })
      const before = store.current

      const result = await invoke.invoke(command, { name: 'Lily58' })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'root-required',
        ids: [anId('root')],
        message: 'The root group "root" can\'t be deleted.',
      })
      expect(store.current).toEqual(before)
    })

    it('returns the error a UiAction gives from apply', async () => {
      const { invoke } = await arrange({ uiActions: [FailingUiAction] })

      const result = await invoke.invoke(FailingUiAction, { name: 'Lily58' })

      expectErr(result)
      expect(result.error).toEqual({ kind: 'stale', seq: 1, latest: 2 })
    })

    it("runs an action with the caller's input without asking its builder", async () => {
      const action = recordAction('test.recordAction', true)
      const recorder = new Recorder()
      const { invoke } = await arrange({
        actions: [action],
        builders: [[action, RecordedBuildName]],
        recorder,
      })

      expectOk(await invoke.invoke(action, { name: 'Lily58' }))

      expect(recorder.recorded).toEqual([{ name: 'Lily58' }])
    })

    it("applies a UiAction with the caller's input without asking its builder", async () => {
      const uiAction = recordName('test.recordName', true)
      const recorder = new Recorder()
      const { invoke } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, RecordedBuildName]],
        recorder,
      })

      expectOk(await invoke.invoke(uiAction, { name: 'Lily58' }))

      expect(recorder.recorded).toEqual([{ name: 'Lily58' }])
    })

    it("applies a UiAction with a caller's null input without asking its builder", async () => {
      const uiAction = recordNullableName()
      const recorder = new Recorder()
      const { invoke } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, RecordedBuildName]],
        recorder,
      })

      expectOk(await invoke.invoke(uiAction, null))

      expect(recorder.recorded).toEqual([null])
    })

    it("refuses a caller's UiAction input its schema refuses, without applying it", async () => {
      const uiAction = recordName('test.recordName', true)
      const recorder = new Recorder()
      const { invoke } = await arrange({ uiActions: [uiAction], recorder })

      const result = await invoke.invoke(uiAction, { name: '' })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'input-invalid',
        command: 'test.recordName',
        issues: [{ path: ['name'], message: expect.any(String) }],
      })
      expect(recorder.recorded).toEqual([])
    })

    it('refuses a command as unavailable before any design is committed without asking its builder for input', async () => {
      const recorder = new Recorder()
      const { invoke } = await arrange({
        commands: [RenameDesign],
        builders: [[RenameDesign, RecordedBuildName]],
        recorder,
      })

      const result = await invoke.invoke(RenameDesign)

      expectUnavailable(result, RenameDesign.id)
      expect(recorder.recorded).toEqual([])
    })

    it('refuses a UiAction input its schema refuses, with plain issue paths, without applying it', async () => {
      const uiAction = recordName('test.recordName', true)
      const recorder = new Recorder()
      const { invoke } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, buildName('')]],
        recorder,
      })

      const result = await invoke.invoke(uiAction)

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'input-invalid',
        command: 'test.recordName',
        issues: [{ path: ['name'], message: expect.any(String) }],
      })
      expect(recorder.recorded).toEqual([])
    })
  })

  describe('available', () => {
    it('says a command is unavailable before any design is committed without asking its builder', async () => {
      const recorder = new Recorder()
      const { invoke } = await arrange({
        commands: [RenameDesign],
        builders: [[RenameDesign, RecordedBuildName]],
        recorder,
      })

      const available = invoke.available(RenameDesign)

      expect({ available, asked: recorder.recorded }).toEqual({ available: false, asked: [] })
    })

    it('says a command is available for input its schema refuses', async () => {
      const command = renameWith({ kind: 'stale', seq: 1, latest: 2 })
      const { invoke } = await arrange({ commands: [command], design: aDesign() })

      expect(invoke.available(command, { name: '' })).toBe(true)
    })

    it('says a command is unavailable when its check refuses', async () => {
      const command = renameWith({ kind: 'stale', seq: 1, latest: 2 })
      const { invoke } = await arrange({ commands: [command], design: aDesign() })

      expect(invoke.available(command, { name: 'Lily58' })).toBe(false)
    })

    it('says a command is available when its check says ok', async () => {
      const command = renameWith()
      const { invoke } = await arrange({ commands: [command], design: aDesign() })

      expect(invoke.available(command, { name: 'Lily58' })).toBe(true)
    })

    it("asks a command's check about its builder's input when the caller gives none", async () => {
      const seen: unknown[] = []
      class SeeName implements Command<NameInput> {
        static readonly kind = 'command'
        static readonly id = 'test.seeName'
        static readonly label = 'See name'
        static readonly input = nameInputSchema

        available(_design: Design, input: NameInput): Result<void, Rejection> {
          seen.push(input)
          return Result.ok()
        }

        apply(): void {}
      }
      const { invoke } = await arrange({
        commands: [SeeName],
        builders: [[SeeName, buildName('Corne')]],
        design: aDesign(),
      })

      invoke.available(SeeName)

      expect(seen).toEqual([{ name: 'Corne' }])
    })

    it('says an action with no design is unavailable when its check says no, and refuses it as such', async () => {
      const action = recordAction('test.recordAction', false)
      const recorder = new Recorder()
      const { invoke } = await arrange({ actions: [action], recorder })

      const available = invoke.available(action, { name: 'Lily58' })
      const result = await invoke.invoke(action, { name: 'Lily58' })

      expect(available).toBe(false)
      expectUnavailable(result, 'test.recordAction')
      expect(recorder.recorded).toEqual([])
    })

    it('says an action with no design is available when its check says yes', async () => {
      const action = recordAction('test.recordAction', true)
      const { invoke } = await arrange({ actions: [action], recorder: new Recorder() })

      expect(invoke.available(action, { name: 'Lily58' })).toBe(true)
    })

    it('says a UiAction is unavailable when its check says no, and refuses it as such', async () => {
      const uiAction = recordName('test.recordName', false)
      const recorder = new Recorder()
      const { invoke } = await arrange({ uiActions: [uiAction], recorder })

      const available = invoke.available(uiAction, { name: 'Lily58' })
      const result = await invoke.invoke(uiAction, { name: 'Lily58' })

      expect(available).toBe(false)
      expectUnavailable(result, 'test.recordName')
      expect(recorder.recorded).toEqual([])
    })

    it('says a UiAction is available when its check says yes', async () => {
      const uiAction = recordName('test.recordName', true)
      const { invoke } = await arrange({ uiActions: [uiAction], recorder: new Recorder() })

      expect(invoke.available(uiAction, { name: 'Lily58' })).toBe(true)
    })

    it('says a UiAction is available for input its schema refuses', async () => {
      const uiAction = recordName('test.recordName', false)
      const { invoke } = await arrange({ uiActions: [uiAction], recorder: new Recorder() })

      expect(invoke.available(uiAction, { name: '' })).toBe(true)
    })
  })

  describe('startup', () => {
    it('refuses two input builders for one handle, naming it', async () => {
      await expect(
        arrange({
          commands: [RenameDesign],
          builders: [
            [RenameDesign, buildName('Corne')],
            [RenameDesign, buildName('Lily58')],
          ],
        }),
      ).rejects.toThrow(new DuplicateInputBuilderError([RenameDesign.id]))
    })

    it('starts with one input builder per handle', async () => {
      const uiAction = recordName('test.recordName', true)

      await expect(
        arrange({
          commands: [RenameDesign],
          uiActions: [uiAction],
          builders: [
            [RenameDesign, buildName('Corne')],
            [uiAction, buildName('Lily58')],
          ],
          recorder: new Recorder(),
        }),
      ).resolves.toMatchObject({ invoke: expect.any(Invoke) })
    })

    it('starts with an input builder for a handle no token holds', async () => {
      await expect(
        arrange({ builders: [[RenameDesign, buildName('Corne')]] }),
      ).resolves.toMatchObject({ invoke: expect.any(Invoke) })
    })
  })
})

class FailingAction implements Action<NameInput, string> {
  static readonly kind = 'action'
  static readonly id = 'test.failingAction'
  static readonly label = 'Failing action'
  static readonly input = nameInputSchema

  available(): boolean {
    return true
  }

  apply(): AsyncResult<void, string> {
    return AsyncResult.err('disk full')
  }
}

class FailingUiAction implements UiAction<NameInput> {
  static readonly kind = 'ui-action'
  static readonly id = 'test.failingUiAction'
  static readonly label = 'Failing UiAction'
  static readonly input = nameInputSchema

  available(): boolean {
    return true
  }

  apply(): AsyncResult<void, Rejection> {
    return AsyncResult.err({ kind: 'stale', seq: 1, latest: 2 })
  }
}

function rejectingCommand(rejection: Rejection) {
  return class RejectingCommand implements Command<NameInput> {
    static readonly kind = 'command'
    static readonly id = 'test.rejectingCommand'
    static readonly label = 'Rejecting command'
    static readonly input = nameInputSchema

    available(): Result<void, Rejection> {
      return Result.ok()
    }

    apply(): Rejection {
      return rejection
    }
  }
}

function waitingAction(finished: Promise<void>) {
  return class WaitingAction implements Action<NameInput, never> {
    static readonly kind = 'action'
    static readonly id = 'test.waitingAction'
    static readonly label = 'Waiting action'
    static readonly input = nameInputSchema

    available(): boolean {
      return true
    }

    apply(): AsyncResult<void, never> {
      return AsyncResult.fromPromise(finished, (cause) => {
        throw cause
      })
    }
  }
}

async function arrangeEvents(entries: Entries, recorder?: Recorder) {
  const container = new Container().addModule(designModule).addModule(editorModule)
  if (recorder !== undefined) container.register(Recorder).useValue(recorder)
  for (const handle of entries.commands ?? []) registerCommand(container, handle)
  for (const handle of entries.actions ?? []) registerAction(container, handle)
  for (const handle of entries.uiActions ?? []) registerUiAction(container, handle)
  for (const [handle, builder] of entries.builders ?? []) {
    registerInputBuilder(container, handle, builder)
  }
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  if (entries.design !== undefined) {
    expectOk(
      container.resolve(DesignStore).replaceDesign({ design: entries.design, unreadable: [] }),
    )
  }
  return container.resolve(Invoke)
}

// An Err's iterator throws past its first yield, so the matchers can't compare one directly.
function eventsOf(invoke: Invoke) {
  const events: unknown[] = []
  invoke.events.on('invoke', (event: InvokeEvent) => {
    const result = event.result.match<unknown>({ ok: () => 'ok', err: (error) => ({ error }) })
    events.push({ ...event, result })
  })
  return events
}

describe('Invoke events', () => {
  it("reports an available command with the caller's input and ok", async () => {
    const invoke = await arrangeEvents({ commands: [RenameDesign], design: aDesign() })
    const events = eventsOf(invoke)

    await invoke.invoke(RenameDesign, { name: 'Lily58' })

    expect(events).toEqual([
      {
        id: RenameDesign.id,
        label: RenameDesign.label,
        input: { name: 'Lily58' },
        result: 'ok',
      },
    ])
  })

  it("reports the builder's input when the caller gives none", async () => {
    const invoke = await arrangeEvents({
      commands: [RenameDesign],
      builders: [[RenameDesign, buildName('Corne')]],
      design: aDesign(),
    })
    const events = eventsOf(invoke)

    await invoke.invoke(RenameDesign)

    expect(events).toEqual([expect.objectContaining({ input: { name: 'Corne' } })])
  })

  it('reports a command with no design as unavailable with no input, leaving its builder unasked', async () => {
    const recorder = new Recorder()
    const invoke = await arrangeEvents(
      { commands: [RenameDesign], builders: [[RenameDesign, RecordedBuildName]] },
      recorder,
    )
    const events = eventsOf(invoke)

    await invoke.invoke(RenameDesign)

    expect({ events, asked: recorder.recorded }).toEqual({
      events: [
        {
          id: RenameDesign.id,
          label: RenameDesign.label,
          input: undefined,
          result: { error: { kind: 'unavailable', command: RenameDesign.id } },
        },
      ],
      asked: [],
    })
  })

  const refusedAction = recordAction('test.refused', false)
  const refusedUiAction = recordName('test.refused', false)

  it.each<[string, EntryHandle, Entries]>([
    ['action', refusedAction, { actions: [refusedAction] }],
    ['UiAction', refusedUiAction, { uiActions: [refusedUiAction] }],
  ])(
    "reports a refused %s as unavailable with its builder's input",
    async (_kind, handle, entries) => {
      const recorder = new Recorder()
      const invoke = await arrangeEvents(
        { ...entries, builders: [[handle, RecordedBuildName]] },
        recorder,
      )
      const events = eventsOf(invoke)

      await invoke.invoke(handle as UiActionHandle)

      expect(events).toEqual([
        {
          id: handle.id,
          label: handle.label,
          input: { name: 'Corne' },
          result: { error: { kind: 'unavailable', command: handle.id } },
        },
      ])
    },
  )

  it('reports the rejection a command returns', async () => {
    const rejection: Rejection = { kind: 'stale', seq: 1, latest: 2 }
    const command = rejectingCommand(rejection)
    const invoke = await arrangeEvents({ commands: [command], design: aDesign() })
    const events = eventsOf(invoke)

    await invoke.invoke(command, { name: 'Lily58' })

    expect(events).toEqual([expect.objectContaining({ result: { error: rejection } })])
  })

  it('reports the error an action gives', async () => {
    const invoke = await arrangeEvents({ actions: [FailingAction] })
    const events = eventsOf(invoke)

    await invoke.invoke(FailingAction, { name: 'Lily58' })

    expect(events).toEqual([expect.objectContaining({ result: { error: 'disk full' } })])
  })

  it('reports a UiAction that applies as ok', async () => {
    const uiAction = recordName('test.recordName', true)
    const invoke = await arrangeEvents({ uiActions: [uiAction] }, new Recorder())
    const events = eventsOf(invoke)

    await invoke.invoke(uiAction, { name: 'Lily58' })

    expect(events).toEqual([expect.objectContaining({ result: 'ok' })])
  })

  it('reports a UiAction input its schema refuses as input-invalid', async () => {
    const uiAction = recordName('test.recordName', true)
    const invoke = await arrangeEvents({ uiActions: [uiAction] }, new Recorder())
    const events = eventsOf(invoke)

    await invoke.invoke(uiAction, { name: '' })

    expect(events).toEqual([
      expect.objectContaining({
        result: {
          error: {
            kind: 'input-invalid',
            command: uiAction.id,
            issues: [{ path: ['name'], message: expect.any(String) }],
          },
        },
      }),
    ])
  })

  it('reports an action once, only after it settles', async () => {
    const settlers: (() => void)[] = []
    const finished = new Promise<void>((settle) => {
      settlers.push(settle)
    })
    const action = waitingAction(finished)
    const invoke = await arrangeEvents({ actions: [action] })
    const events = eventsOf(invoke)

    const result = invoke.invoke(action, { name: 'Lily58' })
    await nextTick()
    const beforeSettling = [...events]
    for (const settle of settlers) settle()
    await result

    expect({ beforeSettling, events }).toEqual({
      beforeSettling: [],
      events: [expect.objectContaining({ id: action.id, result: 'ok' })],
    })
  })
})
