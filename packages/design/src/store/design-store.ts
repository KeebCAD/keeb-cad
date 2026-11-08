import { inject, InjectorToken } from '@keeb-cad/di'
import { checkStructure } from '@keeb-cad/model/main'
import { shallowRef, toRaw } from '@keeb-cad/reactive'
import { AsyncResult, InvariantError, Option, Result } from '@keeb-cad/result'
import {
  type Design,
  type DesignInvalid,
  designSchema,
  type Emptied,
  fingerprintsFileSchema,
  type Frozen,
  type MigratedBundle,
  type Rejection,
  routingFileSchema,
} from '@keeb-cad/schema'
import { createNanoEvents } from 'nanoevents'
import { match, P } from 'ts-pattern'
import type * as v from 'valibot'

import { actions, commands } from '../entries/tokens'
import type { ActionError, ActionHandle, CommandHandle } from '../entries/types'
import { formatIssuePaths } from '../parsing/format-issue-paths'
import { parse } from '../parsing/parse'
import { deepFreeze } from '../patching/deep-freeze'
import { DesignPatcher } from '../patching/design-patcher'
import { parseDesign } from './parse-design'
import { DuplicateCommandIdError } from './duplicate-command-id-error'
import { emptyDerivedFiles } from './empty-derived-files'
import { findDuplicateIds } from './find-duplicate-ids'
import { readDerivedFile } from './read-derived-file'
import { revisionOf } from './revision-of'
import type {
  Committed,
  DerivedFiles,
  DesignStoreEvents,
  Subscribable,
  TypedEmitter,
} from './types'

export class DesignStore {
  readonly events: Subscribable<DesignStoreEvents>

  constructor() {
    const ids = [...this.#commands, ...this.#actions].map((entry) => entry.id)
    const duplicates = findDuplicateIds(ids)
    if (duplicates.length > 0) throw new DuplicateCommandIdError(duplicates)
    this.events = this.#emitter
  }

  get current(): Option<Committed> {
    return Option.fromNullable(this.#current.value)
  }

  run<H extends CommandHandle>(handle: H, input: v.InferInput<H['input']>): Result<void, Rejection>
  run<H extends ActionHandle>(
    handle: H,
    input: v.InferInput<H['input']>,
  ): AsyncResult<void, ActionError<H> | Rejection>
  run(
    handle: CommandHandle | ActionHandle,
    input: unknown,
  ): Result<void, Rejection> | AsyncResult<void, unknown> {
    return match(handle)
      .with(
        P.when((entry): entry is CommandHandle => entry.kind === 'command'),
        (command) => this.#runCommand(command, input),
      )
      .with(
        P.when((entry): entry is ActionHandle => entry.kind === 'action'),
        (action) => this.#runAction(action, input),
      )
      .exhaustive()
  }

  available(handle: CommandHandle | ActionHandle): boolean {
    return match(handle)
      .with(
        P.when((entry): entry is CommandHandle => entry.kind === 'command'),
        (command) => {
          this.#ensureRegistered(this.#commands, command)
          const current = this.#current.value
          return current !== undefined && this.#commandAvailable(command, current.design)
        },
      )
      .with(
        P.when((entry): entry is ActionHandle => entry.kind === 'action'),
        (action) => {
          this.#ensureRegistered(this.#actions, action)
          return this.#actionAvailable(action)
        },
      )
      .exhaustive()
  }

  replaceDesign(bundle: MigratedBundle): Result<{ emptied: Emptied[] }, DesignInvalid> {
    return parseDesign(bundle).map((parsed) => {
      const design = deepFreeze(parsed)
      const revision = revisionOf(design)
      const empty = emptyDerivedFiles(revision)
      const routing = readDerivedFile(routingFileSchema, 'routing', bundle)
      const fingerprints = readDerivedFile(fingerprintsFileSchema, 'fingerprints', bundle)
      const committed = this.#write({
        design,
        routing: deepFreeze(routing.match({ ok: (file) => file, err: () => empty.routing })),
        fingerprints: deepFreeze(
          fingerprints.match({ ok: (file) => file, err: () => empty.fingerprints }),
        ),
        revision,
      })
      const emptied = [routing, fingerprints].flatMap((read) =>
        read.match({ ok: (): Emptied[] => [], err: (reason) => [reason] }),
      )
      this.#emitter.emit('commit', { kind: 'whole', committed })
      return { emptied }
    })
  }

  // Files for another seq than the current belong to another revision, so they are dropped.
  acceptDerivedFiles(files: Frozen<DerivedFiles>, seq: number): void {
    const current = this.#current.value
    // No worker runs before the first Committed, so nothing can post derived files yet.
    if (current === undefined) {
      throw new InvariantError('Derived files were accepted before any design was loaded.')
    }
    if (seq !== current.seq) return
    const committed: Committed = {
      ...current,
      routing: deepFreeze(files.routing),
      fingerprints: deepFreeze(files.fingerprints),
    }
    this.#current.value = committed
    this.#emitter.emit('accept', committed)
  }

  readonly #patcher = inject(DesignPatcher)
  readonly #commands = inject(commands)
  readonly #actions = inject(actions)
  readonly #injector = inject(InjectorToken)
  readonly #emitter: TypedEmitter<DesignStoreEvents> = createNanoEvents<DesignStoreEvents>()
  readonly #current = shallowRef<Committed | undefined>(undefined)

  #runCommand(handle: CommandHandle, input: unknown): Result<void, Rejection> {
    this.#ensureRegistered(this.#commands, handle)
    const copied = this.#copyInput(input)
    const current = this.#committed()
    const { design } = current
    if (!this.#commandAvailable(handle, design))
      return Result.err<Rejection>({ kind: 'unavailable', command: handle.id })
    const command = this.#injector.resolve(handle)
    return parse(handle.input, copied)
      .mapErr((issues): Rejection => ({ kind: 'input-invalid', command: handle.id, issues }))
      .flatMap((parsed) => this.#patcher.change(design, (draft) => command.apply(draft, parsed)))
      .flatMap(({ design: next, patches }): Result<void, Rejection> => {
        if (patches.length === 0) return Result.ok()
        this.#ensureValidDesign(next, handle.id)
        return checkStructure(next).map(() => {
          const { seq, revision } = this.#write({
            ...current,
            design: next,
            revision: revisionOf(next),
          })
          this.#emitter.emit('commit', { kind: 'patches', patches, seq, revision })
        })
      })
  }

  #runAction(handle: ActionHandle, input: unknown): AsyncResult<void, unknown> {
    this.#ensureRegistered(this.#actions, handle)
    const copied = this.#copyInput(input)
    return this.#actionAvailable(handle)
      ? parse(handle.input, copied).match<AsyncResult<void, unknown>>({
          ok: (parsed) => this.#injector.resolve(handle).apply(parsed),
          err: (issues) =>
            AsyncResult.err<Rejection>({ kind: 'input-invalid', command: handle.id, issues }),
        })
      : AsyncResult.err<Rejection>({ kind: 'unavailable', command: handle.id })
  }

  #commandAvailable(handle: CommandHandle, design: Frozen<Design>): boolean {
    return this.#injector.resolve(handle).available(design)
  }

  #actionAvailable(handle: ActionHandle): boolean {
    return this.#injector.resolve(handle).available(this.current)
  }

  #ensureRegistered<H extends CommandHandle | ActionHandle>(
    registered: readonly H[],
    handle: H,
  ): void {
    if (registered.includes(handle)) return
    const kind = handle.kind === 'command' ? 'Command' : 'Action'
    throw new InvariantError(`${kind} "${handle.id}" is not registered.`)
  }

  // A schema that passes a value through would otherwise hand the caller's object to Immer, which
  // freezes it, or carry a Vue proxy into the design.
  #copyInput(input: unknown): unknown {
    return structuredClone(toRaw(input))
  }

  #ensureValidDesign(design: Frozen<Design>, commandId: string): void {
    parse(designSchema, design).match({
      ok: () => {},
      err: (issues) => {
        throw new InvariantError(
          `Command "${commandId}" produced a design the design schema refuses at ${formatIssuePaths(issues)}.`,
        )
      },
    })
  }

  #committed(): Committed {
    const current = this.#current.value
    // The app loads or creates a design before anything runs a command.
    if (current === undefined) {
      throw new InvariantError('A command ran before any design was loaded.')
    }
    return current
  }

  #write(next: Omit<Committed, 'seq'>): Committed {
    const committed = { ...next, seq: (this.#current.value?.seq ?? 0) + 1 }
    this.#current.value = committed
    return committed
  }
}
