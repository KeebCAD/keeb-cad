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
import { AsyncResult, Option } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
import { aDesign, aMeta } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it, onTestFinished } from 'vitest'

import { editorModule } from '../editor-module'
import { Recorder } from '../testing/recorder'
import { registerUiAction } from '../ui-actions/register-ui-action'
import type { UiAction, UiActionHandle } from '../ui-actions/types'
import { DuplicateInputBuilderError } from './duplicate-input-builder-error'
import { Invoke } from './invoke'
import { registerInputBuilder } from './register-input-builder'
import type { EntryHandle, InputBuilder } from './types'

const nameInputSchema = v.object({ name: v.pipe(v.string(), v.minLength(1)) })
type NameInput = v.InferOutput<typeof nameInputSchema>

class RenameDesign implements Command<NameInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = nameInputSchema

  available(): boolean {
    return true
  }

  apply(draft: Writable<Design>, input: NameInput): void {
    draft.meta.name = input.name
  }
}

function renameWith(available: boolean) {
  return class RenameWith implements Command<NameInput> {
    static readonly kind = 'command'
    static readonly id = 'meta.renameWith'
    static readonly label = 'Rename with'
    static readonly input = nameInputSchema

    available(): boolean {
      return available
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

    apply(input: NullableNameInput): void {
      this.#recorder.recorded.push(input)
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

    apply(input: NameInput): void {
      this.#recorder.recorded.push(input)
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

async function arrange({
  commands = [],
  actions = [],
  uiActions = [],
  builders = [],
  design,
}: Entries) {
  const container = new Container().addModule(designModule).addModule(editorModule)
  container.register(Recorder).useClass(Recorder)
  for (const handle of commands) registerCommand(container, handle)
  for (const handle of actions) registerAction(container, handle)
  for (const handle of uiActions) registerUiAction(container, handle)
  for (const [handle, builder] of builders) registerInputBuilder(container, handle, builder)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  if (design !== undefined) expectOk(store.replaceDesign({ design, unreadable: [] }))
  return { invoke: container.resolve(Invoke), store, recorder: container.resolve(Recorder) }
}

function nameOf(store: DesignStore): Option<string> {
  return store.current.map((committed) => committed.design.meta.name)
}

describe('Invoke', () => {
  describe('invoke', () => {
    it('says a command is unavailable before any design is committed, and refuses it as such', async () => {
      const { invoke, store } = await arrange({ commands: [RenameDesign] })

      const available = invoke.available(RenameDesign)
      const result = await invoke.invoke(RenameDesign)

      expect(available).toBe(false)
      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: RenameDesign.id })
      expect(store.current).toEqual(Option.none())
    })

    it("runs a command with the caller's input without asking its builder", async () => {
      const { invoke, store, recorder } = await arrange({
        commands: [RenameDesign],
        builders: [[RenameDesign, RecordedBuildName]],
        design: aDesign(),
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

    it('refuses an action its check says no to without asking its builder', async () => {
      const action = recordAction('test.recordAction', false)
      const { invoke, recorder } = await arrange({
        actions: [action],
        builders: [[action, RecordedBuildName]],
      })

      const result = await invoke.invoke(action)

      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: 'test.recordAction' })
      expect(recorder.recorded).toEqual([])
    })

    it('refuses a UiAction its check says no to without asking its builder', async () => {
      const uiAction = recordName('test.recordName', false)
      const { invoke, recorder } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, RecordedBuildName]],
      })

      const result = await invoke.invoke(uiAction)

      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: 'test.recordName' })
      expect(recorder.recorded).toEqual([])
    })

    it("runs an action with the caller's input without asking its builder", async () => {
      const action = recordAction('test.recordAction', true)
      const { invoke, recorder } = await arrange({
        actions: [action],
        builders: [[action, RecordedBuildName]],
      })

      expectOk(await invoke.invoke(action, { name: 'Lily58' }))

      expect(recorder.recorded).toEqual([{ name: 'Lily58' }])
    })

    it("applies a UiAction with the caller's input without asking its builder", async () => {
      const uiAction = recordName('test.recordName', true)
      const { invoke, recorder } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, RecordedBuildName]],
      })

      expectOk(await invoke.invoke(uiAction, { name: 'Lily58' }))

      expect(recorder.recorded).toEqual([{ name: 'Lily58' }])
    })

    it("applies a UiAction with a caller's null input without asking its builder", async () => {
      const uiAction = recordNullableName()
      const { invoke, recorder } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, RecordedBuildName]],
      })

      expectOk(await invoke.invoke(uiAction, null))

      expect(recorder.recorded).toEqual([null])
    })

    it("refuses a caller's UiAction input its schema refuses, without applying it", async () => {
      const uiAction = recordName('test.recordName', true)
      const { invoke, recorder } = await arrange({ uiActions: [uiAction] })

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
      const { invoke, recorder } = await arrange({
        commands: [RenameDesign],
        builders: [[RenameDesign, RecordedBuildName]],
      })

      const result = await invoke.invoke(RenameDesign)

      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: RenameDesign.id })
      expect(recorder.recorded).toEqual([])
    })

    it('refuses a UiAction input its schema refuses, with plain issue paths, without applying it', async () => {
      const uiAction = recordName('test.recordName', true)
      const { invoke, recorder } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, buildName('')]],
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
    it('says a command with a design committed is unavailable when its check says no, and refuses it as such', async () => {
      const command = renameWith(false)
      const { invoke, store } = await arrange({ commands: [command], design: aDesign() })
      const before = store.current

      const available = invoke.available(command)
      const result = await invoke.invoke(command, { name: 'Lily58' })

      expect(available).toBe(false)
      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: command.id })
      expect(store.current).toEqual(before)
    })

    it('says a command with a design committed is available when its check says yes', async () => {
      const command = renameWith(true)
      const { invoke } = await arrange({ commands: [command], design: aDesign() })

      expect(invoke.available(command)).toBe(true)
    })

    it('says an action with no design is unavailable when its check says no, and refuses it as such', async () => {
      const action = recordAction('test.recordAction', false)
      const { invoke, recorder } = await arrange({ actions: [action] })

      const available = invoke.available(action)
      const result = await invoke.invoke(action, { name: 'Lily58' })

      expect(available).toBe(false)
      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: 'test.recordAction' })
      expect(recorder.recorded).toEqual([])
    })

    it('says an action with no design is available when its check says yes', async () => {
      const action = recordAction('test.recordAction', true)
      const { invoke } = await arrange({ actions: [action] })

      expect(invoke.available(action)).toBe(true)
    })

    it('says a UiAction is unavailable when its check says no, and refuses it as such', async () => {
      const uiAction = recordName('test.recordName', false)
      const { invoke, recorder } = await arrange({ uiActions: [uiAction] })

      const available = invoke.available(uiAction)
      const result = await invoke.invoke(uiAction, { name: 'Lily58' })

      expect(available).toBe(false)
      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: 'test.recordName' })
      expect(recorder.recorded).toEqual([])
    })

    it('says a UiAction is available when its check says yes', async () => {
      const uiAction = recordName('test.recordName', true)
      const { invoke } = await arrange({ uiActions: [uiAction] })

      expect(invoke.available(uiAction)).toBe(true)
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
