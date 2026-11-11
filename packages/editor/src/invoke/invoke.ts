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
import { AsyncResult, Result } from '@keeb-cad/result'
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

  available<H extends EntryHandle>(
    handle: H,
    input?: v.InferInput<H['input']>,
  ): Result<void, Rejection> {
    if (handle.kind === 'command' && this.#store.current.isNone()) {
      return Result.err({ kind: 'unavailable', command: handle.id })
    }
    return this.#check(handle, this.#inputFor(handle, input)).match<Result<void, Rejection>>({
      ok: () => Result.ok(),
      // A parse failure of built input answers ok, so a malformed built input surfaces as an error
      // when used instead of hiding as a greyed item.
      err: (rejection) =>
        rejection.kind === 'input-invalid' && input === undefined
          ? Result.ok()
          : Result.err(rejection),
    })
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
  // is unavailable before its input is built.
  #invokeCommand(handle: CommandHandle, input: unknown): AsyncResult<void, Rejection> {
    if (this.#store.current.isNone()) return this.#unavailable(handle, input)
    const entryInput = this.#inputFor(handle, input)
    return this.#reported(
      handle,
      entryInput,
      AsyncResult.fromResult(this.#store.run(handle, entryInput)),
    )
  }

  #invokeAction(handle: ActionHandle, input: unknown): AsyncResult<void, unknown> {
    const entryInput = this.#inputFor(handle, input)
    return this.#reported(handle, entryInput, this.#store.run(handle, entryInput))
  }

  #invokeUiAction(handle: UiActionHandle, input: unknown): AsyncResult<void, Rejection> {
    const entryInput = this.#inputFor(handle, input)
    return this.#reported(
      handle,
      entryInput,
      this.#checkUiAction(handle, entryInput).match<AsyncResult<void, Rejection>>({
        ok: (parsed) => this.#injector.resolve(handle).apply(parsed),
        err: (rejection) => AsyncResult.err(rejection),
      }),
    )
  }

  #check(handle: EntryHandle, entryInput: unknown): Result<unknown, Rejection> {
    return match(handle)
      .with(
        P.when((entry): entry is CommandHandle | ActionHandle => entry.kind !== 'ui-action'),
        (entry) => this.#store.available(entry, entryInput),
      )
      .with(
        P.when((entry): entry is UiActionHandle => entry.kind === 'ui-action'),
        (uiAction) => this.#checkUiAction(uiAction, entryInput),
      )
      .exhaustive()
  }

  // Parses before it checks, as the design store does, and gives the parsed input to apply.
  #checkUiAction(handle: UiActionHandle, entryInput: unknown): Result<unknown, Rejection> {
    return parse(handle.input, entryInput)
      .mapErr((issues): Rejection => ({ kind: 'input-invalid', command: handle.id, issues }))
      .flatMap((parsed) =>
        this.#injector.resolve(handle).available()
          ? Result.ok(parsed)
          : Result.err<Rejection>({ kind: 'unavailable', command: handle.id }),
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
