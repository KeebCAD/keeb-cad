import { Container } from '@keeb-cad/di'
import { hash } from '@keeb-cad/hashing'
import { reactive } from '@keeb-cad/reactive'
import { InvariantError, Option } from '@keeb-cad/result'
import { expectErr, expectOk } from '@keeb-cad/result/testing'
import { formSchema, type Rejection } from '@keeb-cad/schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designModule } from '../design-module'
import { defineAction } from '../entries/define-action'
import { defineCommand } from '../entries/define-command'
import { actions, commands } from '../entries/tokens'
import type { ActionDefinition, CommandDefinition } from '../entries/types'
import { expectDeeplyFrozen, expectNothingFrozen, metaOnlyDesign } from '../testing'
import { DesignStore } from './design-store'
import { DuplicateCommandIdError } from './duplicate-command-id-error'
import type { Committed, CommitEvent } from './types'

const rename = defineCommand({
  id: 'test.rename',
  label: 'Rename',
  input: v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
  apply: (draft, input) => {
    draft.meta.name = input.name
  },
})

const setForm = defineCommand({
  id: 'test.setForm',
  label: 'Set form',
  input: v.object({ form: formSchema }),
  apply: (draft, input) => {
    draft.meta.form = input.form
  },
})

interface Arrangement {
  commands?: CommandDefinition[]
  actions?: ActionDefinition[]
  design?: unknown
}

async function arrange(arrangement: Arrangement = {}): Promise<DesignStore> {
  const container = new Container().addModule(designModule)
  for (const entry of arrangement.commands ?? []) container.register(commands).useValue(entry)
  for (const entry of arrangement.actions ?? []) container.register(actions).useValue(entry)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  if (arrangement.design !== undefined) expectOk(store.replaceDesign(arrangement.design))
  return store
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
  describe('run', () => {
    it('commits a command: a frozen design, the next seq, its revision and its patches', async () => {
      const store = await arrange({ commands: [rename], design: metaOnlyDesign() })
      const before = committed(store)
      const events = recordCommits(store)

      expectOk(store.run(rename, { name: 'Corne v2' }))

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
      const store = await arrange({ commands: [setForm], design: metaOnlyDesign() })
      const before = committed(store)
      const input = makeInput()

      expectOk(store.run(setForm, input))

      const design = { meta: { ...before.design.meta, form: { type: 'unibody' } } }
      expect(store.current).toEqual(
        Option.some({ design, seq: before.seq + 1, revision: hash(design) }),
      )
      expectDeeplyFrozen(committed(store).design)
      expectNothingFrozen(input)
    })

    it('refuses with the rejection the apply step returns and discards its draft', async () => {
      const rejection: Rejection = { kind: 'stale', seq: 1, latest: 2 }
      const refuse = defineCommand({
        id: 'test.refuse',
        label: 'Refuse',
        input: v.object({}),
        apply: (draft) => {
          draft.meta.name = 'discarded'
          return rejection
        },
      })
      const store = await arrange({ commands: [refuse], design: metaOnlyDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(refuse, {})

      expectErr(result)
      expect(result.error).toBe(rejection)

      expectNothingCommitted(store, before, events)
    })

    it('refuses input the schema refuses, with plain issue paths', async () => {
      const store = await arrange({ commands: [rename], design: metaOnlyDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(rename, { name: '' })

      expectErr(result)
      expect(result.error).toEqual({
        kind: 'input-invalid',
        command: 'test.rename',
        issues: [{ path: ['name'], message: expect.any(String) }],
      })

      expectNothingCommitted(store, before, events)
    })

    it('refuses a command that is unavailable', async () => {
      const locked = defineCommand({
        id: 'test.locked',
        label: 'Locked',
        input: v.object({}),
        available: () => false,
        apply: (draft) => {
          draft.meta.name = 'discarded'
        },
      })
      const store = await arrange({ commands: [locked], design: metaOnlyDesign() })
      const before = store.current
      const events = recordCommits(store)

      const result = store.run(locked, {})

      expectErr(result)
      expect(result.error).toEqual({ kind: 'unavailable', command: 'test.locked' })

      expectNothingCommitted(store, before, events)
    })

    it('throws on a command that is not registered', async () => {
      const store = await arrange({ design: metaOnlyDesign() })

      expect(() => store.run(rename, { name: 'Corne v2' })).toThrow(
        new InvariantError('Command "test.rename" is not registered.'),
      )
    })

    it('throws before any design is loaded', async () => {
      const store = await arrange({ commands: [rename] })

      expect(() => store.run(rename, { name: 'Corne v2' })).toThrow(InvariantError)
    })

    it('lets a throwing listener escape after the commit', async () => {
      const store = await arrange({ commands: [rename], design: metaOnlyDesign() })
      const before = committed(store)
      store.events.on('commit', () => {
        throw new Error('listener failed')
      })

      expect(() => store.run(rename, { name: 'Corne v2' })).toThrow('listener failed')

      const design = { meta: { ...before.design.meta, name: 'Corne v2' } }
      expect(store.current).toEqual(
        Option.some({ design, seq: before.seq + 1, revision: hash(design) }),
      )
    })
  })

  describe('startup', () => {
    it('refuses two commands with one id', async () => {
      const again = defineCommand({ ...rename, label: 'Rename again' })

      await expect(arrange({ commands: [rename, again] })).rejects.toThrow(
        new DuplicateCommandIdError(['test.rename']),
      )
    })

    it('refuses a command and an action with one id', async () => {
      const action = defineAction({ id: 'test.rename', label: 'Rename', input: v.object({}) })

      await expect(arrange({ commands: [rename], actions: [action] })).rejects.toThrow(
        DuplicateCommandIdError,
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
