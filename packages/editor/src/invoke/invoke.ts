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

import type { UiActionHandle } from '../ui-actions/types'
import { DuplicateInputBuilderError } from './duplicate-input-builder-error'
import { inputBuilders } from './tokens'
import type { EntryHandle, InputBuilderRegistration } from './types'

export class Invoke {
  constructor() {
    const duplicates = findDuplicateIds(this.#builders.map(({ handle }) => handle.id))
    if (duplicates.length > 0) throw new DuplicateInputBuilderError(duplicates)
  }

  invoke<H extends CommandHandle>(handle: H): AsyncResult<void, Rejection>
  invoke<H extends ActionHandle>(handle: H): AsyncResult<void, ActionError<H> | Rejection>
  invoke<H extends UiActionHandle>(handle: H): AsyncResult<void, Rejection>
  invoke(handle: EntryHandle): AsyncResult<void, unknown> {
    return match(handle)
      .with(
        P.when((entry): entry is CommandHandle => entry.kind === 'command'),
        (command) => this.#invokeCommand(command),
      )
      .with(
        P.when((entry): entry is ActionHandle => entry.kind === 'action'),
        (action) => this.#store.run(action, this.#inputFor(action)),
      )
      .with(
        P.when((entry): entry is UiActionHandle => entry.kind === 'ui-action'),
        (uiAction) => this.#invokeUiAction(uiAction),
      )
      .exhaustive()
  }

  readonly #store = inject(DesignStore)
  readonly #injector = inject(InjectorToken)
  readonly #builders: readonly InputBuilderRegistration[] = inject(inputBuilders)

  #inputFor(handle: EntryHandle): unknown {
    const registration = this.#builders.find((entry) => entry.handle === handle)
    return registration === undefined ? {} : this.#injector.resolve(registration.builder).input()
  }

  // A command's availability check takes a design, so with none committed it could only say no.
  #invokeCommand(handle: CommandHandle): AsyncResult<void, Rejection> {
    return this.#store.current.isNone()
      ? AsyncResult.err<Rejection>({ kind: 'unavailable', command: handle.id })
      : AsyncResult.fromResult(this.#store.run(handle, this.#inputFor(handle)))
  }

  #invokeUiAction(handle: UiActionHandle): AsyncResult<void, Rejection> {
    const uiAction = this.#injector.resolve(handle)
    if (!uiAction.available())
      return AsyncResult.err<Rejection>({ kind: 'unavailable', command: handle.id })
    return parse(handle.input, this.#inputFor(handle)).match<AsyncResult<void, Rejection>>({
      ok: (parsed) => {
        uiAction.apply(parsed)
        return AsyncResult.ok()
      },
      err: (issues) => AsyncResult.err({ kind: 'input-invalid', command: handle.id, issues }),
    })
  }
}
