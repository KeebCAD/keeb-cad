import {
  type Command,
  type CommandHandle,
  DesignStore,
  designModule,
  registerCommand,
  type Writable,
} from '@keeb-cad/design'
import { Container, inject } from '@keeb-cad/di'
import { Option } from '@keeb-cad/result'
import { expectErr } from '@keeb-cad/result/testing'
import type { Design } from '@keeb-cad/schema'
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

function recordName(id: string, available: boolean): UiActionHandle {
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
  uiActions?: readonly UiActionHandle[]
  builders?: readonly (readonly [EntryHandle, new () => InputBuilder<unknown>])[]
}

async function arrange({ commands = [], uiActions = [], builders = [] }: Entries) {
  const container = new Container().addModule(designModule).addModule(editorModule)
  container.register(Recorder).useClass(Recorder)
  for (const handle of commands) registerCommand(container, handle)
  for (const handle of uiActions) registerUiAction(container, handle)
  for (const [handle, builder] of builders) registerInputBuilder(container, handle, builder)
  onTestFinished(() => container.dispose())
  await container.autoLoad()
  return {
    invoke: container.resolve(Invoke),
    store: container.resolve(DesignStore),
    recorder: container.resolve(Recorder),
  }
}

describe('Invoke', () => {
  describe('invoke', () => {
    it('refuses a command as unavailable before any design is committed', async () => {
      const { invoke, store } = await arrange({ commands: [RenameDesign] })

      const result = await invoke.invoke(RenameDesign)

      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: RenameDesign.id })
      expect(store.current).toEqual(Option.none())
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

    it('refuses a UiAction its availability check says no to, without applying it', async () => {
      const uiAction = recordName('test.recordName', false)
      const { invoke, recorder } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, buildName('Corne')]],
      })

      const result = await invoke.invoke(uiAction)

      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: 'test.recordName' })
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
