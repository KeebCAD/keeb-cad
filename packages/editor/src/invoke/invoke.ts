import {
  type ActionError,
  type ActionHandle,
  type CommandHandle,
  DesignStore,
  findDuplicateIds,
  parse,
} from '@keeb-cad/design'
import { inject, InjectorToken } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'
import { match, P } from 'ts-pattern'
import type * as v from 'valibot'

import type { UiActionHandle } from '../ui-actions/types'
import { DuplicateInputBuilderError } from './duplicate-input-builder-error'
import { inputBuilders } from './tokens'
import type { EntryHandle, InputBuilderRegistration } from './types'

export class Invoke {
  constructor() {
    const duplicates = findDuplicateIds(this.#builders.map(({ handle }) => handle.id))
    if (duplicates.length > 0) throw new DuplicateInputBuilderError(duplicates)
  }

  invoke<H extends CommandHandle>(
    handle: H,
    input?: v.InferInput<H['input']>,
  ): AsyncResult<void, Rejection>
  invoke<H extends ActionHandle>(
    handle: H,
    input?: v.InferInput<H['input']>,
  ): AsyncResult<void, ActionError<H> | Rejection>
  invoke<H extends UiActionHandle>(
    handle: H,
    input?: v.InferInput<H['input']>,
  ): AsyncResult<void, Rejection>
  invoke(handle: EntryHandle, input?: unknown): AsyncResult<void, unknown> {
    return match(handle)
      .with(
        P.when((entry): entry is CommandHandle => entry.kind === 'command'),
        (command) => this.#invokeCommand(command, input),
      )
      .with(
        P.when((entry): entry is ActionHandle => entry.kind === 'action'),
        (action) => this.#invokeAction(action, input),
      )
      .with(
        P.when((entry): entry is UiActionHandle => entry.kind === 'ui-action'),
        (uiAction) => this.#invokeUiAction(uiAction, input),
      )
      .exhaustive()
  }

  available(handle: EntryHandle): boolean {
    return match(handle)
      .with(
        P.when((entry): entry is CommandHandle | ActionHandle => entry.kind !== 'ui-action'),
        (entry) => this.#store.available(entry),
      )
      .with(
        P.when((entry): entry is UiActionHandle => entry.kind === 'ui-action'),
        (uiAction) => this.#injector.resolve(uiAction).available(),
      )
      .exhaustive()
  }

  readonly #store = inject(DesignStore)
  readonly #injector = inject(InjectorToken)
  readonly #builders: readonly InputBuilderRegistration[] = inject(inputBuilders)

  // `undefined` is the caller passing none; `null` is input a nullable schema may want.
  #inputFor(handle: EntryHandle, input: unknown): unknown {
    if (input !== undefined) return input
    const registration = this.#builders.find((entry) => entry.handle === handle)
    return registration === undefined ? {} : this.#injector.resolve(registration.builder).input()
  }

  // Asking first keeps the store's no-design throw out of reach: with none committed, a command
  // is unavailable.
  #invokeCommand(handle: CommandHandle, input: unknown): AsyncResult<void, Rejection> {
    return this.available(handle)
      ? AsyncResult.fromResult(this.#store.run(handle, this.#inputFor(handle, input)))
      : this.#unavailable(handle)
  }

  // The store checks availability too, but only after its input argument is built, so asking
  // first keeps the builder from running for an action that can't.
  #invokeAction(handle: ActionHandle, input: unknown): AsyncResult<void, unknown> {
    return this.available(handle)
      ? this.#store.run(handle, this.#inputFor(handle, input))
      : this.#unavailable(handle)
  }

  #invokeUiAction(handle: UiActionHandle, input: unknown): AsyncResult<void, Rejection> {
    if (!this.available(handle)) return this.#unavailable(handle)
    const uiAction = this.#injector.resolve(handle)
    return parse(handle.input, this.#inputFor(handle, input)).match<AsyncResult<void, Rejection>>({
      ok: (parsed) => {
        uiAction.apply(parsed)
        return AsyncResult.ok()
      },
      err: (issues) => AsyncResult.err({ kind: 'input-invalid', command: handle.id, issues }),
    })
  }

  #unavailable(handle: EntryHandle): AsyncResult<void, Rejection> {
    return AsyncResult.err<Rejection>({ kind: 'unavailable', command: handle.id })
  }
}
