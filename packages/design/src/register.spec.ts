import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { Container, DuplicateRegistrationError, type Module } from '@keeb-cad/di'
import { isProxy, reactive, toRaw } from '@keeb-cad/reactive'
import { formSchema, type Design, type Frozen, type Id, type Mutable } from '@keeb-cad/schema'

import { applyDesignPatches, type Writable } from './immer'
import { designModule } from './module'
import {
  actionsToken,
  CommandRegister,
  commandsToken,
  defineAction,
  defineCommand,
  DuplicateCommandIdError,
  type ActionDefinition,
  type CommandDefinition,
} from './register'
import { DesignState, type CommitEvent } from './state'

// design's unit tests define their own test commands (AD-2).
const renameDesign = defineCommand({
  id: 'test.renameDesign',
  label: () => 'Rename',
  input: v.object({ name: v.string() }),
  available: () => true,
  apply: (draft, { name }) => {
    draft.meta.name = name
  },
})

const setForm = defineCommand({
  id: 'test.setForm',
  label: () => 'Set form',
  input: v.object({ form: formSchema }),
  available: () => true,
  apply: (draft, { form }) => {
    draft.meta.form = form
  },
})

const refuseRename = defineCommand({
  id: 'test.refuseRename',
  label: () => 'Refuse',
  input: v.object({ name: v.string() }),
  available: () => true,
  apply: (draft, { name }) => {
    draft.meta.name = name
    return { kind: 'unavailable', command: 'test.refuseRename' }
  },
})

const neverAvailable = defineCommand({
  id: 'test.neverAvailable',
  label: () => 'Never',
  input: v.object({}),
  available: () => false,
  apply: () => {},
})

const actionCalls: string[] = []
const recordName = defineAction({
  id: 'test.recordName',
  label: () => 'Record',
  input: v.object({ name: v.string() }),
  available: (design) => design.meta.form.type === 'split',
  apply: ({ name }) => {
    actionCalls.push(name)
  },
})

const meta = { id: 'my-board', name: 'My board', form: { type: 'split', board: 'mirrored' } }

function setup(
  commands: readonly CommandDefinition[] = [renameDesign, setForm, refuseRename, neverAvailable],
  actions: readonly ActionDefinition[] = [recordName],
) {
  const testModule: Module = {
    register(container) {
      for (const command of commands) container.register(commandsToken).useValue(command)
      for (const action of actions) container.register(actionsToken).useValue(action)
    },
  }
  const container = new Container().addModules([designModule, testModule])
  const state = container.resolve(DesignState)
  const register = container.resolve(CommandRegister)
  const events: CommitEvent[] = []
  state.onCommit((event) => events.push(event))
  return { state, register, events }
}

function loaded() {
  const context = setup()
  context.state.replaceDesign({ meta })
  context.events.length = 0
  return context
}

/** Every object in `value` is frozen and none is a Vue proxy. */
function expectDeeplyFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return
  expect(Object.isFrozen(value)).toBe(true)
  expect(isProxy(value)).toBe(false)
  for (const field of Object.values(value)) expectDeeplyFrozen(field)
}

describe('CommandRegister.run: a command', () => {
  it('applies, freezes the new design deeply and emits one commit', () => {
    const { state, register, events } = loaded()
    const before = state.design

    expect(register.run(renameDesign, { name: 'Corney' })).toEqual({ ok: true, value: undefined })

    expect(state.design?.meta.name).toBe('Corney')
    expectDeeplyFrozen(state.design)
    expect(state.seq).toBe(2)
    expect(events).toHaveLength(1)
    const [event] = events
    expect(event?.kind).toBe('commit')
    expect(event?.seq).toBe(2)
    expect(event?.revision).toBe(state.revision)
    expect(state.revision).not.toBe(undefined)
    // The patches applied to the previous design give the new one.
    if (event?.kind !== 'commit' || !before) throw new Error('expected a commit')
    expect(event.patches).not.toEqual([])
    expect(applyDesignPatches(before, event.patches)).toEqual(state.design)
    expectDeeplyFrozen(applyDesignPatches(before, event.patches))
  })

  it('copies a Vue reactive input and leaves it unfrozen', () => {
    const { state, register } = loaded()
    const input = reactive({ form: { type: 'unibody' as const } })

    expect(register.run(setForm, input).ok).toBe(true)

    expect(state.design?.meta.form).toEqual({ type: 'unibody' })
    expect(state.design?.meta.form).not.toBe(input.form)
    expect(state.design?.meta.form).not.toBe(toRaw(input.form))
    expect(isProxy(state.design?.meta.form)).toBe(false)
    expectDeeplyFrozen(state.design)
    expect(Object.isFrozen(toRaw(input))).toBe(false)
    expect(Object.isFrozen(toRaw(input.form))).toBe(false)
  })

  it('leaves a plain input unfrozen', () => {
    const { register } = loaded()
    const input = { name: 'Corney' }

    register.run(renameDesign, input)

    expect(Object.isFrozen(input)).toBe(false)
  })

  it('discards the draft when apply returns a rejection', () => {
    const { state, register, events } = loaded()
    const before = state.design

    const result = register.run(refuseRename, { name: 'Corney' })

    expect(result).toEqual({
      ok: false,
      error: { kind: 'unavailable', command: 'test.refuseRename' },
    })
    expect(state.design).toBe(before)
    expect(state.seq).toBe(1)
    expect(events).toEqual([])
  })

  it('refuses an invalid input with input-invalid, the command id and each issue path', () => {
    const { state, register, events } = loaded()

    // @ts-expect-error -- the compiler checks the input; the register checks it again at runtime
    const result = register.run(renameDesign, { name: 42 })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatchObject({ kind: 'input-invalid', command: 'test.renameDesign' })
    expect(result.error.kind === 'input-invalid' && result.error.issues.map((i) => i.path)).toEqual(
      [['name']],
    )
    expect(state.seq).toBe(1)
    expect(events).toEqual([])
  })

  it('refuses an unavailable command with its id', () => {
    const { state, register, events } = loaded()

    expect(register.run(neverAvailable, {})).toEqual({
      ok: false,
      error: { kind: 'unavailable', command: 'test.neverAvailable' },
    })
    expect(state.seq).toBe(1)
    expect(events).toEqual([])
  })

  it('throws when no design is loaded (a bug)', () => {
    const { register } = setup()

    expect(() => register.run(renameDesign, { name: 'Corney' })).toThrow(/no design loaded/)
  })

  it('throws for a handle that is not registered (a bug)', () => {
    const { state, register } = setup([renameDesign])
    state.replaceDesign({ meta })

    expect(() => register.run(refuseRename, { name: 'Corney' })).toThrow(/not registered/)
  })
})

describe('CommandRegister.run: an action', () => {
  it('parses, checks availability and applies without touching the design', () => {
    const { state, register, events } = loaded()
    actionCalls.length = 0

    expect(register.run(recordName, { name: 'Corney' })).toEqual({ ok: true, value: undefined })

    expect(actionCalls).toEqual(['Corney'])
    expect(state.seq).toBe(1)
    expect(events).toEqual([])
  })
})

describe('CommandRegister: startup', () => {
  it('throws DuplicateCommandIdError when two entries share an id', () => {
    const twin = defineAction({ ...recordName, id: 'test.renameDesign' })

    expect(() => setup([renameDesign], [twin])).toThrow(DuplicateCommandIdError)
  })

  it('resolves eagerly at autoLoad, so a duplicate fails at startup', async () => {
    const container = new Container().addModules([
      designModule,
      {
        register(c) {
          c.register(commandsToken).useValue(renameDesign)
          c.register(commandsToken).useValue(renameDesign)
        },
      },
    ])

    await expect(container.autoLoad()).rejects.toThrow(DuplicateCommandIdError)
  })

  it('lists every entry with its label and availability', () => {
    const { register } = loaded()

    expect(
      register.entries().map(({ handle, label, available }) => [handle.id, label, available]),
    ).toEqual([
      ['test.renameDesign', 'Rename', true],
      ['test.setForm', 'Set form', true],
      ['test.refuseRename', 'Refuse', true],
      ['test.neverAvailable', 'Never', false],
      ['test.recordName', 'Record', true],
    ])
  })

  it('throws DuplicateRegistrationError when the design module is added twice', () => {
    expect(() => new Container().addModules([designModule, designModule])).toThrow(
      DuplicateRegistrationError,
    )
  })
})

describe('types', () => {
  it('forbids a nested write to a frozen design and accepts a draft as Mutable', () => {
    expectTypeOf<Writable<Design>>().toExtend<Mutable<Design>>()
    expectTypeOf<Frozen<Design>['meta']['id']>().toExtend<Id>()
    expectTypeOf<Mutable<Design>['meta']['id']>().toExtend<Id>()
    expectTypeOf(renameDesign.id).toEqualTypeOf<'test.renameDesign'>()

    const write = (design: Frozen<Design>) => {
      // @ts-expect-error -- a frozen design is deeply readonly
      design.meta.name = 'x'
    }
    expect(write).toBeTypeOf('function')
  })
})
