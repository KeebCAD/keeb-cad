import * as v from 'valibot'

import { createMultiToken, inject } from '@keeb-cad/di'
import { checkStructure } from '@keeb-cad/model/main'
import type { Design, Frozen, Rejection, Result } from '@keeb-cad/schema'

import { produceDesign, type Writable } from './immer'
import { toSchemaIssues } from './issues'
import { COMMIT, DesignState } from './state'

/** Any command or action input schema (AD-24's format). */
export type InputSchema = v.GenericSchema

type Entry = {
  /** Namespaced by the handle's concept folder (`layout.moveSlot`); never shown or translated. */
  readonly id: string
  /** What menus, the palette and undo show; a function, so it is re-read after a locale change. */
  readonly label: () => string
  readonly input: InputSchema
  available(design: Frozen<Design>): boolean
}

/** An undoable register entry that writes the authored sections (AD-2). */
export interface CommandDefinition<
  TId extends string = string,
  TInput extends InputSchema = InputSchema,
> extends Entry {
  readonly kind: 'command'
  readonly id: TId
  readonly input: TInput
  apply(draft: Writable<Design>, input: v.InferOutput<TInput>): void | Rejection
}

/** A register entry that never writes the authored sections and is not undoable (AD-2). */
export interface ActionDefinition<
  TId extends string = string,
  TInput extends InputSchema = InputSchema,
> extends Entry {
  readonly kind: 'action'
  readonly id: TId
  readonly input: TInput
  apply(input: v.InferOutput<TInput>): void | Rejection
}

export type RegisterEntry = CommandDefinition | ActionDefinition

/** Makes a command handle; its id is inferred as a literal. */
export function defineCommand<const TId extends string, TInput extends InputSchema>(
  definition: Omit<CommandDefinition<TId, TInput>, 'kind'>,
): CommandDefinition<TId, TInput> {
  return { ...definition, kind: 'command' }
}

/** Makes an action handle; its id is inferred as a literal. */
export function defineAction<const TId extends string, TInput extends InputSchema>(
  definition: Omit<ActionDefinition<TId, TInput>, 'kind'>,
): ActionDefinition<TId, TInput> {
  return { ...definition, kind: 'action' }
}

/** Filled by one `di` module per concept folder in `commands`. */
export const commandsToken = createMultiToken<CommandDefinition>('commands')
export const actionsToken = createMultiToken<ActionDefinition>('actions')

/** Two register entries share one id: a startup bug. */
export class DuplicateCommandIdError extends Error {
  readonly commandId: string

  constructor(commandId: string) {
    super(`Command id "${commandId}" is registered more than once.`)
    this.name = 'DuplicateCommandIdError'
    this.commandId = commandId
  }
}

/** A handle as menus and the palette read it: its label and availability now. */
export type RegisterListing = { handle: RegisterEntry; label: string; available: boolean }

/**
 * The command register (AD-2): runs registered commands and actions. `run` returns a `Rejection`
 * for every expected refusal and throws only on a bug (no design loaded, an unregistered handle).
 */
export class CommandRegister {
  readonly #state = inject(DesignState)
  readonly #entries: readonly RegisterEntry[]

  constructor() {
    this.#entries = [...inject(commandsToken), ...inject(actionsToken)]
    const seen = new Set<string>()
    for (const { id } of this.#entries) {
      if (seen.has(id)) throw new DuplicateCommandIdError(id)
      seen.add(id)
    }
  }

  /** Every registered handle, with its label and its availability over the current design. */
  entries(): RegisterListing[] {
    const design = this.#state.design
    return this.#entries.map((handle) => ({
      handle,
      label: handle.label(),
      available: design !== undefined && handle.available(design),
    }))
  }

  run<TInput extends InputSchema>(
    handle: CommandDefinition<string, TInput> | ActionDefinition<string, TInput>,
    input: v.InferInput<TInput>,
  ): Result<void, Rejection> {
    const entry: RegisterEntry = handle
    if (!this.#entries.includes(entry)) {
      throw new Error(`Command "${entry.id}" is not registered.`)
    }
    const design = this.#state.design
    if (design === undefined) {
      throw new Error(`Command "${entry.id}" ran with no design loaded.`)
    }
    const parsed = v.safeParse(entry.input, input)
    if (!parsed.success) {
      return refuse({
        kind: 'input-invalid',
        command: entry.id,
        issues: toSchemaIssues(parsed.issues),
      })
    }
    if (!entry.available(design)) return refuse({ kind: 'unavailable', command: entry.id })
    if (entry.kind === 'action') {
      const rejection = entry.apply(parsed.output)
      return rejection ? refuse(rejection) : { ok: true, value: undefined }
    }
    const produced = produceDesign(design, (draft) => entry.apply(draft, parsed.output))
    const rejection = produced.returned ?? checkStructure(produced.design)
    if (rejection) return refuse(rejection)
    this.#state[COMMIT](produced.design, produced.patches)
    return { ok: true, value: undefined }
  }
}

function refuse(error: Rejection): Result<void, Rejection> {
  return { ok: false, error }
}
