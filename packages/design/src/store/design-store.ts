import { inject } from '@keeb-cad/di'
import { hash } from '@keeb-cad/hashing'
import { checkStructure } from '@keeb-cad/model/main'
import { shallowRef } from '@keeb-cad/reactive'
import { InvariantError, Option, Result } from '@keeb-cad/result'
import {
  type Design,
  type DesignInvalid,
  designSchema,
  type Frozen,
  type Rejection,
  revisionSchema,
} from '@keeb-cad/schema'
import { createNanoEvents } from 'nanoevents'
import * as v from 'valibot'

import { actions, commands } from '../entries/tokens'
import type { CommandDefinition } from '../entries/types'
import { parse } from '../parsing/parse'
import { deepFreeze } from '../patching/deep-freeze'
import { DesignPatcher } from '../patching/design-patcher'
import { DuplicateCommandIdError } from './duplicate-command-id-error'
import { findDuplicateIds } from './find-duplicate-ids'
import type { Committed, DesignStoreEvents, Subscribable, TypedEmitter } from './types'

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

  run<Input extends v.GenericSchema>(
    command: CommandDefinition<string, Input>,
    input: v.InferInput<Input>,
  ): Result<void, Rejection> {
    if (!this.#commands.includes(command)) {
      throw new InvariantError(`Command "${command.id}" is not registered.`)
    }
    const { design } = this.#committed()
    if (!command.available(design)) {
      return Result.err<Rejection>({ kind: 'unavailable', command: command.id })
    }
    return parse(command.input, input)
      .mapErr((issues): Rejection => ({ kind: 'input-invalid', command: command.id, issues }))
      .flatMap((parsed) => this.#patcher.change(design, (draft) => command.apply(draft, parsed)))
      .flatMap((changed) => checkStructure(changed.design).map(() => changed))
      .map(({ design: next, patches }) => {
        const { seq, revision } = this.#write(next)
        this.#emitter.emit('commit', { kind: 'patches', patches, seq, revision })
      })
  }

  replaceDesign(value: unknown): Result<void, DesignInvalid> {
    return parse(designSchema, value)
      .mapErr((issues): DesignInvalid => ({ kind: 'design-invalid', issues }))
      .map((parsed) => {
        const design = deepFreeze(parsed)
        const { seq, revision } = this.#write(design)
        this.#emitter.emit('commit', { kind: 'whole', design, seq, revision })
      })
  }

  readonly #patcher = inject(DesignPatcher)
  readonly #commands = inject(commands)
  readonly #actions = inject(actions)
  readonly #emitter: TypedEmitter<DesignStoreEvents> = createNanoEvents<DesignStoreEvents>()
  readonly #current = shallowRef<Committed | undefined>(undefined)

  #committed(): Committed {
    const current = this.#current.value
    // The app loads or creates a design before anything runs a command.
    if (current === undefined) {
      throw new InvariantError('A command ran before any design was loaded.')
    }
    return current
  }

  #write(design: Frozen<Design>): Committed {
    const seq = (this.#current.value?.seq ?? 0) + 1
    const committed = { design, seq, revision: v.parse(revisionSchema, hash(design)) }
    this.#current.value = committed
    return committed
  }
}
