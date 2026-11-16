import { Container } from '@keeb-cad/di'
import { InvariantError, Result } from '@keeb-cad/result'
import { expectOk, expectResult } from '@keeb-cad/result/testing'
import type { Design, FingerprintsFile, Frozen, Rejection, RoutingFile } from '@keeb-cad/schema'
import {
  aDesign,
  aFingerprintsFile,
  aLayout,
  aMeta,
  anId,
  aRevision,
  aRoutingFile,
  aSideComponentOverride,
  aSideId,
  aSlot,
} from '@keeb-cad/schema/testing'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { designModule } from '../design-module'
import { registerCommand } from '../entries/register-command'
import type { Command } from '../entries/types'
import type { Writable } from '../patching/types'
import { expectDeeplyFrozen } from '../testing'
import { DesignStore } from './design-store'
import type { Committed, CommitEvent } from './types'

// Test commands edit the draft themselves, so undo's tests need no domain.
const renameDesignInputSchema = v.object({ name: v.pipe(v.string(), v.minLength(1)) })
type RenameDesignInput = v.InferOutput<typeof renameDesignInputSchema>

class RenameDesign implements Command<RenameDesignInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.renameDesign'
  static readonly label = 'Rename design'
  static readonly input = renameDesignInputSchema

  available(_design: Frozen<Design>): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, input: RenameDesignInput): void {
    draft.meta.name = input.name
  }
}

const addOverrideInputSchema = v.object({})
type AddOverrideInput = v.InferOutput<typeof addOverrideInputSchema>

class AddOverride implements Command<AddOverrideInput> {
  static readonly kind = 'command'
  static readonly id = 'overrides.addOverride'
  static readonly label = 'Add override'
  static readonly input = addOverrideInputSchema

  available(_design: Frozen<Design>): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, _input: AddOverrideInput): void {
    draft.overrides.push(aSideComponentOverride({ target: aSideId('left/k1'), component: 'a' }))
  }
}

const setComponentInputSchema = v.object({ component: v.string() })
type SetComponentInput = v.InferOutput<typeof setComponentInputSchema>

class SetComponent implements Command<SetComponentInput> {
  static readonly kind = 'command'
  static readonly id = 'overrides.setComponent'
  static readonly label = 'Set component'
  static readonly input = setComponentInputSchema

  available(_design: Frozen<Design>): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, input: SetComponentInput): void {
    const override = draft.overrides[0]
    if (override?.type === 'side-component') override.component = input.component
  }
}

function refusal(): Rejection {
  return { kind: 'stale', seq: 1, latest: 2 }
}

class RefuseRename implements Command<RenameDesignInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.refuseRename'
  static readonly label = 'Refuse rename'
  static readonly input = renameDesignInputSchema

  available(_design: Frozen<Design>): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, input: RenameDesignInput): Rejection {
    draft.meta.name = input.name
    return refusal()
  }
}

class Unregistered implements Command<RenameDesignInput> {
  static readonly kind = 'command'
  static readonly id = 'meta.unregistered'
  static readonly label = 'Unregistered'
  static readonly input = renameDesignInputSchema

  available(_design: Frozen<Design>): Result<void, Rejection> {
    return Result.ok()
  }

  apply(draft: Writable<Design>, input: RenameDesignInput): void {
    draft.meta.name = input.name
  }
}

function routingFile(revision: string): RoutingFile {
  return aRoutingFile({ revision: aRevision(revision) })
}

function fingerprintsFile(revision: string): FingerprintsFile {
  return aFingerprintsFile({ revision: aRevision(revision) })
}
const KEY = 'k'
const OTHER_KEY = 'j'
const UNDO_UNAVAILABLE = { kind: 'unavailable', command: 'design.undo' } as const
const REDO_UNAVAILABLE = { kind: 'unavailable', command: 'design.redo' } as const

function loadedDesign(): Design {
  return aDesign({ layout: aLayout({ children: [aSlot({ id: anId('k1') })] }) })
}

async function arrange({ loaded = true }: { loaded?: boolean } = {}): Promise<DesignStore> {
  const container = new Container().addModule(designModule)
  registerCommand(container, RenameDesign)
  registerCommand(container, AddOverride)
  registerCommand(container, SetComponent)
  registerCommand(container, RefuseRename)
  await container.autoLoad()
  const store = container.resolve(DesignStore)
  if (loaded) load(store, loadedDesign())
  return store
}

function load(store: DesignStore, design: Design): void {
  expectOk(
    store.replaceDesign({
      design,
      routing: routingFile('R0'),
      fingerprints: fingerprintsFile('F0'),
      unreadable: [],
    }),
  )
}

function committed(store: DesignStore): Committed {
  const current = store.current
  if (current.isNone()) throw new Error('Expected a committed design.')
  return current.value
}

function nameOf(store: DesignStore): string {
  return committed(store).design.meta.name
}

function rename(store: DesignStore, name: string, coalesce?: string): void {
  expectOk(store.run(RenameDesign, { name }, coalesce === undefined ? {} : { coalesce }))
}

function acceptAtCurrentSeq(
  store: DesignStore,
  routing: RoutingFile,
  fingerprints = committed(store).fingerprints,
): void {
  store.acceptDerivedFiles({ routing, fingerprints }, committed(store).seq)
}

// What each step committed, until one is unavailable: one value per entry it crossed. The bound
// stops a history that never runs out.
function replayAll(
  store: DesignStore,
  step: (store: DesignStore) => Result<void, Rejection>,
): Committed[] {
  const reached: Committed[] = []
  while (reached.length < 10 && step(store).isOk()) reached.push(committed(store))
  return reached
}

// The design name after each undo, until one is unavailable: one name per entry.
function undoAll(store: DesignStore): string[] {
  return replayAll(store, (each) => each.undo()).map(({ design }) => design.meta.name)
}

function recordCommits(store: DesignStore): CommitEvent[] {
  const events: CommitEvent[] = []
  store.events.on('commit', (event) => events.push(event))
  return events
}

describe('DesignStore undo and redo', () => {
  describe('replaying patches', () => {
    it('undoes each command in turn, each at the next seq, back to the loaded revision', async () => {
      const store = await arrange()
      const loaded = committed(store)
      rename(store, 'A')
      rename(store, 'B')
      rename(store, 'C')

      const undone = replayAll(store, (each) => each.undo())

      expect(undone.map(({ design, seq }) => ({ name: design.meta.name, seq }))).toEqual([
        { name: 'B', seq: loaded.seq + 4 },
        { name: 'A', seq: loaded.seq + 5 },
        { name: 'Corne', seq: loaded.seq + 6 },
      ])
      expect(committed(store).revision).toBe(loaded.revision)
    })

    it('redoes each command in turn, reaching the revision of that commit', async () => {
      const store = await arrange()
      rename(store, 'A')
      const atA = committed(store).revision
      rename(store, 'B')
      const atB = committed(store).revision
      rename(store, 'C')
      const atC = committed(store).revision
      undoAll(store)

      const redone = replayAll(store, (each) => each.redo())

      expect(redone.map(({ design, revision }) => ({ name: design.meta.name, revision }))).toEqual([
        { name: 'A', revision: atA },
        { name: 'B', revision: atB },
        { name: 'C', revision: atC },
      ])
    })

    it("undoes a coalesced session's commands in reverse run order", async () => {
      const store = await arrange()
      const loaded = committed(store).design
      expectOk(store.run(AddOverride, {}, { coalesce: KEY }))
      expectOk(store.run(SetComponent, { component: 'b' }, { coalesce: KEY }))

      expectOk(store.undo())

      expect(committed(store).design).toEqual(loaded)
    })

    it("redoes a coalesced session's commands in run order", async () => {
      const store = await arrange()
      expectOk(store.run(AddOverride, {}, { coalesce: KEY }))
      expectOk(store.run(SetComponent, { component: 'b' }, { coalesce: KEY }))
      const afterSession = committed(store).design
      expectOk(store.undo())

      expectOk(store.redo())

      expect(committed(store).design).toEqual(afterSession)
    })

    it('leaves the design deeply frozen after undo and after redo', async () => {
      const store = await arrange()
      expectOk(store.run(AddOverride, {}))
      expectOk(store.undo())
      expectDeeplyFrozen(committed(store).design)

      expectOk(store.redo())

      expectDeeplyFrozen(committed(store).design)
    })
  })

  describe('the routing file', () => {
    it("restores a record's accepted routing on undo, and the one the next commit carried on redo", async () => {
      const store = await arrange()
      rename(store, 'A')
      acceptAtCurrentSeq(store, routingFile('R1'))
      rename(store, 'B')

      expectOk(store.undo())
      const afterUndo = committed(store).routing
      expectOk(store.redo())

      expect({ afterUndo, afterRedo: committed(store).routing }).toEqual({
        afterUndo: routingFile('R1'),
        afterRedo: routingFile('R1'),
      })
    })

    it('restores the loaded routing on undo and the accepted one on redo', async () => {
      const store = await arrange()
      rename(store, 'A')
      acceptAtCurrentSeq(store, routingFile('R1'))

      expectOk(store.undo())
      const afterUndo = committed(store).routing
      expectOk(store.redo())

      expect({ afterUndo, afterRedo: committed(store).routing }).toEqual({
        afterUndo: routingFile('R0'),
        afterRedo: routingFile('R1'),
      })
    })

    it('never restores the fingerprints file', async () => {
      const store = await arrange()
      rename(store, 'A')
      acceptAtCurrentSeq(store, routingFile('R1'), fingerprintsFile('F1'))

      expectOk(store.undo())

      expect(committed(store)).toMatchObject({
        routing: routingFile('R0'),
        fingerprints: fingerprintsFile('F1'),
      })
    })

    it('keeps a routing accepted after an undo for that undo record', async () => {
      const store = await arrange()
      rename(store, 'A')
      expectOk(store.undo())
      acceptAtCurrentSeq(store, routingFile('R2'))
      expectOk(store.redo())

      expectOk(store.undo())

      expect(committed(store).routing).toEqual(routingFile('R2'))
    })

    it('gives a folded entry the routing current at the fold', async () => {
      const store = await arrange()
      rename(store, 'A', KEY)
      acceptAtCurrentSeq(store, routingFile('R1'))
      rename(store, 'B', KEY)

      expectOk(store.undo())
      const afterUndo = { name: nameOf(store), routing: committed(store).routing }
      expectOk(store.redo())

      expect({ afterUndo, afterRedo: committed(store).routing }).toEqual({
        afterUndo: { name: 'Corne', routing: routingFile('R0') },
        afterRedo: routingFile('R1'),
      })
    })
  })

  describe('commit events', () => {
    it('emits patches events, only undo and redo carrying the routing they restore', async () => {
      const store = await arrange()
      const loaded = committed(store)
      const events = recordCommits(store)
      rename(store, 'A')
      const renamed = committed(store)
      acceptAtCurrentSeq(store, routingFile('R1'))

      expectOk(store.undo())
      expectOk(store.redo())

      const patch = (value: string) => [{ op: 'replace', path: ['meta', 'name'], value }]
      expect(events).toEqual([
        {
          kind: 'patches',
          patches: patch('A'),
          seq: loaded.seq + 1,
          revision: renamed.revision,
        },
        {
          kind: 'patches',
          patches: patch('Corne'),
          seq: loaded.seq + 2,
          revision: loaded.revision,
          routing: routingFile('R0'),
        },
        {
          kind: 'patches',
          patches: patch('A'),
          seq: loaded.seq + 3,
          revision: renamed.revision,
          routing: routingFile('R1'),
        },
      ])
      expect(events[0]).not.toHaveProperty('routing')
    })
  })

  describe('an empty side', () => {
    it.each([
      ['undo', (store: DesignStore) => store.undo(), UNDO_UNAVAILABLE],
      ['redo', (store: DesignStore) => store.redo(), REDO_UNAVAILABLE],
    ])(
      '%s with no design loaded is unavailable and emits nothing',
      async (_side, step, expected) => {
        const store = await arrange({ loaded: false })
        const events = recordCommits(store)

        expectResult(step(store), Result.err(expected))
        expect({ current: store.current.isNone(), events }).toEqual({ current: true, events: [] })
      },
    )

    it.each([
      ['undo', (store: DesignStore) => store.undo(), UNDO_UNAVAILABLE],
      ['redo', (store: DesignStore) => store.redo(), REDO_UNAVAILABLE],
    ])(
      '%s on an empty history is unavailable and changes nothing',
      async (_side, step, expected) => {
        const store = await arrange()
        const before = committed(store)
        const events = recordCommits(store)

        expectResult(step(store), Result.err(expected))
        expect({ current: committed(store), events }).toStrictEqual({ current: before, events: [] })
      },
    )

    it('redoes one entry once, then is unavailable', async () => {
      const store = await arrange()
      rename(store, 'A')
      expectOk(store.undo())

      expectOk(store.redo())

      expectResult(store.redo(), Result.err(REDO_UNAVAILABLE))
    })

    it('undoes one entry once, then is unavailable', async () => {
      const store = await arrange()
      rename(store, 'A')

      expectOk(store.undo())

      expectResult(store.undo(), Result.err(UNDO_UNAVAILABLE))
    })

    it('records a session after an unavailable undo', async () => {
      const store = await arrange()
      const before = committed(store)
      expectResult(store.undo(), Result.err(UNDO_UNAVAILABLE))
      expect({ design: committed(store).design, seq: committed(store).seq }).toEqual({
        design: before.design,
        seq: before.seq,
      })

      rename(store, 'A', KEY)

      expect(undoAll(store)).toEqual(['Corne'])
    })
  })

  describe('linear history', () => {
    it('drops redo when a command commits after an undo', async () => {
      const store = await arrange()
      rename(store, 'A')
      expectOk(store.undo())
      rename(store, 'B')

      expectResult(store.redo(), Result.err(REDO_UNAVAILABLE))
      expect(nameOf(store)).toBe('B')
    })

    it('clears the history on replaceDesign, which becomes the first undo record', async () => {
      const store = await arrange()
      rename(store, 'A', KEY)
      load(store, aDesign({ meta: aMeta({ name: 'Replaced' }) }))
      rename(store, 'B', KEY)

      expect(undoAll(store)).toEqual(['Replaced'])
    })
  })

  describe('coalescing', () => {
    it.each([
      [
        'one key, three renames: one entry',
        [
          ['A', KEY],
          ['AB', KEY],
          ['ABC', KEY],
        ],
        ['Corne'],
      ],
      [
        'keys k, j, k: three entries',
        [
          ['A', KEY],
          ['B', OTHER_KEY],
          ['C', KEY],
        ],
        ['B', 'A', 'Corne'],
      ],
      [
        'keys k, none, k: three entries',
        [
          ['A', KEY],
          ['B', undefined],
          ['C', KEY],
        ],
        ['B', 'A', 'Corne'],
      ],
      [
        'the empty key twice: one entry, since the empty key is a key',
        [
          ['A', ''],
          ['B', ''],
        ],
        ['Corne'],
      ],
    ] as const)('%s', async (_case, runs, expectedUndoNames) => {
      const store = await arrange()

      const ran = runs.map(
        ([name, coalesce]) =>
          store.run(RenameDesign, { name }, coalesce === undefined ? {} : { coalesce }).kind,
      )

      expect({ ran, undone: undoAll(store) }).toEqual({
        ran: runs.map(() => 'ok'),
        undone: expectedUndoNames,
      })
    })

    it('keeps the session open across an unavailable redo', async () => {
      const store = await arrange()
      rename(store, 'A', KEY)
      expectResult(store.redo(), Result.err(REDO_UNAVAILABLE))

      rename(store, 'B', KEY)

      expect(undoAll(store)).toEqual(['Corne'])
    })

    it('folds different commands under one key into one entry', async () => {
      const store = await arrange()
      const loaded = committed(store).design
      rename(store, 'A', KEY)
      expectOk(store.run(AddOverride, {}, { coalesce: KEY }))

      expectOk(store.undo())

      expect(committed(store).design).toEqual(loaded)
      expectResult(store.undo(), Result.err(UNDO_UNAVAILABLE))
    })

    it('starts a new entry after a redo closed the session', async () => {
      const store = await arrange()
      rename(store, 'A', KEY)
      expectOk(store.undo())
      expectOk(store.redo())

      rename(store, 'B', KEY)

      expect(undoAll(store)).toEqual(['A', 'Corne'])
    })

    it('starts a new entry after an undo closed the session, dropping redo', async () => {
      const store = await arrange()
      rename(store, 'A', KEY)
      expectOk(store.undo())

      rename(store, 'B', KEY)

      expectResult(store.redo(), Result.err(REDO_UNAVAILABLE))
      expect({ name: nameOf(store), undone: undoAll(store) }).toEqual({
        name: 'B',
        undone: ['Corne'],
      })
    })

    it('keeps the session open across a refused input, which commits nothing', async () => {
      const store = await arrange()
      rename(store, 'A', KEY)
      const before = committed(store)

      const refused = store.run(RenameDesign, { name: '' }, { coalesce: KEY })

      expect(refused).toMatchObject({ kind: 'err', error: { kind: 'input-invalid' } })
      expect(committed(store)).toBe(before)
      rename(store, 'C', KEY)
      expect(undoAll(store)).toEqual(['Corne'])
    })

    it('keeps the session open across a command with no patches under another key', async () => {
      const store = await arrange()
      rename(store, 'A', KEY)

      expectOk(store.run(RenameDesign, { name: 'A' }, { coalesce: OTHER_KEY }))
      expectOk(store.run(RenameDesign, { name: 'C' }, { coalesce: KEY }))

      expect(undoAll(store)).toEqual(['Corne'])
    })
  })

  describe('a refused run', () => {
    it("returns the apply step's rejection and leaves design, seq and history unchanged", async () => {
      const store = await arrange()
      rename(store, 'A', KEY)
      const before = committed(store)
      const events = recordCommits(store)

      const result = store.run(RefuseRename, { name: 'discarded' }, { coalesce: KEY })

      expectResult(result, Result.err(refusal()))
      expect({ events }).toEqual({ events: [] })
      expect(committed(store)).toBe(before)
      rename(store, 'C', KEY)
      expect(undoAll(store)).toEqual(['Corne'])
    })

    it('throws for an unregistered handle and leaves the history and session unchanged', async () => {
      const store = await arrange()
      rename(store, 'A', KEY)
      const before = committed(store)

      expect(() => store.run(Unregistered, { name: 'X' }, { coalesce: KEY })).toThrow(
        InvariantError,
      )
      expect(committed(store)).toBe(before)
      rename(store, 'C', KEY)
      expect(undoAll(store)).toEqual(['Corne'])
    })
  })
})
