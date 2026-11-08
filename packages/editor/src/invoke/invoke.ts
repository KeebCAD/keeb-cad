import {
  type ActionError,
  type ActionHandle,
  type CommandHandle,
  DesignStore,
  findDuplicateIds,
  parse,
  type Subscribable,
  type TypedEmitter,
} from '@keeb-cad/design'
import { inject, InjectorToken } from '@keeb-cad/di'
import { AsyncResult } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'
import { createNanoEvents } from 'nanoevents'
import { match, P } from 'ts-pattern'
import type * as v from 'valibot'

import type { UiActionHandle } from '../ui-actions/types'
import { DuplicateInputBuilderError } from './duplicate-input-builder-error'
import { inputBuilders } from './tokens'
import type { EntryHandle, InputBuilderRegistration, InvokeEvents } from './types'

export class Invoke {
  readonly events: Subscribable<InvokeEvents>

  constructor() {
    const duplicates = findDuplicateIds(this.#builders.map(({ handle }) => handle.id))
    if (duplicates.length > 0) throw new DuplicateInputBuilderError(duplicates)
    this.events = this.#emitter
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
  readonly #emitter: TypedEmitter<InvokeEvents> = createNanoEvents<InvokeEvents>()

  // `undefined` is the caller passing none; `null` is input a nullable schema may want.
  #inputFor(handle: EntryHandle, input: unknown): unknown {
    if (input !== undefined) return input
    const registration = this.#builders.find((entry) => entry.handle === handle)
    return registration === undefined ? {} : this.#injector.resolve(registration.builder).input()
  }

  // Asking first keeps the store's no-design throw out of reach: with none committed, a command
  // is unavailable.
  #invokeCommand(handle: CommandHandle, input: unknown): AsyncResult<void, Rejection> {
    if (!this.available(handle)) return this.#unavailable(handle, input)
    const entryInput = this.#inputFor(handle, input)
    return this.#reported(
      handle,
      entryInput,
      AsyncResult.fromResult(this.#store.run(handle, entryInput)),
    )
  }

  // The store checks availability too, but only after its input argument is built, so asking
  // first keeps the builder from running for an action that can't.
  #invokeAction(handle: ActionHandle, input: unknown): AsyncResult<void, unknown> {
    if (!this.available(handle)) return this.#unavailable(handle, input)
    const entryInput = this.#inputFor(handle, input)
    return this.#reported(handle, entryInput, this.#store.run(handle, entryInput))
  }

  #invokeUiAction(handle: UiActionHandle, input: unknown): AsyncResult<void, Rejection> {
    if (!this.available(handle)) return this.#unavailable(handle, input)
    const uiAction = this.#injector.resolve(handle)
    const entryInput = this.#inputFor(handle, input)
    return this.#reported(
      handle,
      entryInput,
      parse(handle.input, entryInput).match<AsyncResult<void, Rejection>>({
        ok: (parsed) => {
          uiAction.apply(parsed)
          return AsyncResult.ok()
        },
        err: (issues) => AsyncResult.err({ kind: 'input-invalid', command: handle.id, issues }),
      }),
    )
  }

  #unavailable(handle: EntryHandle, input: unknown): AsyncResult<void, Rejection> {
    return this.#reported(
      handle,
      input,
      AsyncResult.err<Rejection>({ kind: 'unavailable', command: handle.id }),
    )
  }

  #reported<E>(
    handle: EntryHandle,
    input: unknown,
    result: AsyncResult<void, E>,
  ): AsyncResult<void, E> {
    // No rejection handler: it would mark the result handled and silence a bug for `void invoke()`.
    void result.then((settled) => {
      this.#emitter.emit('invoke', {
        id: handle.id,
        label: handle.label,
        input,
        result: settled,
      })
    })
    return result
  }
}
