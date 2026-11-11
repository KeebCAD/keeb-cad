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
import { AsyncResult, InvariantError, Result } from '@keeb-cad/result'
import { expectOk } from '@keeb-cad/result/testing'
import type { Design, Rejection } from '@keeb-cad/schema'
import { aDesign } from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it, onTestFinished } from 'vitest'

import { editorModule } from '../editor-module'
import { registerInputBuilder } from '../invoke/register-input-builder'
import type { EntryHandle, InputBuilder } from '../invoke/types'
import { press, pressKey } from '../testing/press'
import { Recorder } from '../testing/recorder'
import { registerUiAction } from '../ui-actions/register-ui-action'
import type { UiAction, UiActionHandle } from '../ui-actions/types'
import { DuplicateHandleIdError } from './duplicate-handle-id-error'
import { ShortcutRegistry } from './shortcut-registry'

const expectedDefaultName = 'Pressed'
const expectedBuiltName = 'Built'

const renameDesignInputSchema = v.object({
  name: v.optional(v.string(), expectedDefaultName),
})
type RenameDesignInput = v.InferOutput<typeof renameDesignInputSchema>
type RenameDesignBuilt = v.InferInput<typeof renameDesignInputSchema>

function renameDesign(hotkeys?: readonly string[]): CommandHandle {
  return class RenameDesign implements Command<RenameDesignInput> {
    static readonly kind = 'command'
    static readonly id = 'meta.renameDesign'
    static readonly label = 'Rename design'
    static readonly input = renameDesignInputSchema
    static readonly hotkeys = hotkeys

    available(): Result<void, Rejection> {
      return Result.ok()
    }

    apply(draft: Writable<Design>, input: RenameDesignInput): void {
      draft.meta.name = input.name
    }
  }
}

class BuildRenameInput implements InputBuilder<RenameDesignBuilt> {
  input(): RenameDesignBuilt {
    return { name: expectedBuiltName }
  }
}

const recordInputSchema = v.object({ note: v.optional(v.string()) })
type RecordInput = v.InferOutput<typeof recordInputSchema>

function recordAction(id: string, hotkeys?: readonly string[]): ActionHandle {
  return class RecordAction implements Action<RecordInput, never> {
    static readonly kind = 'action'
    static readonly id = id
    static readonly label = 'Record action'
    static readonly input = recordInputSchema
    static readonly hotkeys = hotkeys

    available(): boolean {
      return true
    }

    apply(input: RecordInput): AsyncResult<void, never> {
      this.#recorder.recorded.push(input)
      return AsyncResult.ok()
    }

    readonly #recorder = inject(Recorder)
  }
}

function recordUiAction(id: string, hotkeys?: readonly string[], available = true): UiActionHandle {
  return class RecordUiAction implements UiAction<RecordInput> {
    static readonly kind = 'ui-action'
    static readonly id = id
    static readonly label = 'Record UiAction'
    static readonly input = recordInputSchema
    static readonly hotkeys = hotkeys

    available(): boolean {
      return available
    }

    apply(input: RecordInput): AsyncResult<void, Rejection> {
      this.#recorder.recorded.push(input)
      return AsyncResult.ok()
    }

    readonly #recorder = inject(Recorder)
  }
}

class BuildNote implements InputBuilder<RecordInput> {
  input(): RecordInput {
    return { note: 'built' }
  }
}

interface Entries {
  commands?: readonly CommandHandle[]
  actions?: readonly ActionHandle[]
  uiActions?: readonly UiActionHandle[]
  builders?: readonly (readonly [EntryHandle, new () => InputBuilder<unknown>])[]
  design?: Design
  recorder?: Recorder
}

async function arrange({
  commands = [],
  actions = [],
  uiActions = [],
  builders = [],
  design,
  recorder,
}: Entries) {
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
  return { registry: container.resolve(ShortcutRegistry), store }
}

describe('ShortcutRegistry', () => {
  describe('a pressed hotkey', () => {
    it('runs a command with an empty input when no builder is registered', async () => {
      const { registry, store } = await arrange({
        commands: [renameDesign(['A'])],
        design: aDesign(),
      })
      registry.listen(document)

      press('A')

      expect(store.current.getOrUndefined()).toMatchObject({
        design: { meta: { name: expectedDefaultName } },
      })
    })

    it("runs a command with its input builder's input", async () => {
      const command = renameDesign(['A'])
      const { registry, store } = await arrange({
        commands: [command],
        builders: [[command, BuildRenameInput]],
        design: aDesign(),
      })
      registry.listen(document)

      press('A')

      expect(store.current.getOrUndefined()).toMatchObject({
        design: { meta: { name: expectedBuiltName } },
      })
    })

    it('runs an action', async () => {
      const recorder = new Recorder()
      const { registry } = await arrange({
        actions: [recordAction('test.record', ['B'])],
        recorder,
      })
      registry.listen(document)

      press('B')

      expect(recorder.recorded).toEqual([{}])
    })

    it("runs a UiAction with its input builder's input", async () => {
      const uiAction = recordUiAction('test.record', ['T'])
      const recorder = new Recorder()
      const { registry } = await arrange({
        uiActions: [uiAction],
        builders: [[uiAction, BuildNote]],
        recorder,
      })
      registry.listen(document)

      press('T')

      expect(recorder.recorded).toEqual([{ note: 'built' }])
    })

    it.each<[string, readonly string[] | undefined, RecordInput[]]>([
      ['no hotkeys', undefined, []],
      ['an empty hotkey list', [], []],
      ['one hotkey', ['A'], [{}]],
      ['two hotkeys', ['A', 'B'], [{}, {}]],
    ])(
      'runs a handle with %s once per hotkey it declares, and not at all without one',
      async (_name, hotkeys, expected) => {
        const recorder = new Recorder()
        const { registry } = await arrange({
          uiActions: [recordUiAction('test.record', hotkeys)],
          recorder,
        })
        registry.listen(document)

        press('A')
        press('B')

        expect(recorder.recorded).toEqual(expected)
      },
    )
  })

  describe('the answer to the hotkey layer', () => {
    it.each([
      ['leaves the key unclaimed and does not run an unavailable entry', false, false, []],
      ['claims the key and runs an available entry once', true, true, [{}]],
    ])('%s', async (_role, available, expectedPrevented, expectedRuns) => {
      const recorder = new Recorder()
      const { registry } = await arrange({
        uiActions: [recordUiAction('test.record', ['Insert'], available)],
        recorder,
      })
      registry.listen(document)

      const keydown = pressKey({ key: 'Insert', code: 'Insert' })

      expect({ prevented: keydown.defaultPrevented, runs: recorder.recorded }).toEqual({
        prevented: expectedPrevented,
        runs: expectedRuns,
      })
    })
  })

  describe('startup', () => {
    it.each<[string, Entries]>([
      [
        'a command',
        { commands: [renameDesign()], uiActions: [recordUiAction('meta.renameDesign')] },
      ],
      [
        'an action',
        {
          actions: [recordAction('meta.renameDesign')],
          uiActions: [recordUiAction('meta.renameDesign')],
        },
      ],
      [
        'another UiAction',
        {
          uiActions: [recordUiAction('meta.renameDesign'), recordUiAction('meta.renameDesign')],
        },
      ],
    ])('refuses a UiAction that shares its id with %s, naming it', async (_name, entries) => {
      await expect(arrange({ ...entries, recorder: new Recorder() })).rejects.toThrow(
        new DuplicateHandleIdError(['meta.renameDesign']),
      )
    })

    it('starts with a command, an action and a UiAction of distinct ids', async () => {
      await expect(
        arrange({
          commands: [renameDesign()],
          actions: [recordAction('test.action')],
          uiActions: [recordUiAction('test.uiAction')],
          recorder: new Recorder(),
        }),
      ).resolves.toMatchObject({ registry: expect.any(ShortcutRegistry) })
    })

    it('refuses a malformed hotkey', async () => {
      await expect(
        arrange({ uiActions: [recordUiAction('test.record', ['mod+'])], recorder: new Recorder() }),
      ).rejects.toThrow()
    })

    it('starts with a well-formed chord', async () => {
      await expect(
        arrange({
          uiActions: [recordUiAction('test.record', ['mod+K'])],
          recorder: new Recorder(),
        }),
      ).resolves.toMatchObject({ registry: expect.any(ShortcutRegistry) })
    })
  })

  describe('listen', () => {
    it('throws while a layer is already listening', async () => {
      const { registry } = await arrange({})
      registry.listen(document)

      expect(() => registry.listen(document)).toThrow(InvariantError)
    })

    it('listens again after stop', async () => {
      const recorder = new Recorder()
      const { registry } = await arrange({
        uiActions: [recordUiAction('test.record', ['T'])],
        recorder,
      })
      registry.listen(document)
      registry.stop()

      registry.listen(document)
      press('T')

      expect(recorder.recorded).toEqual([{}])
    })
  })
})
