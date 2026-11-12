import {
  type CommitEvent,
  DesignStore,
  parse,
  type Subscribable,
  type TypedEmitter,
} from '@keeb-cad/design'
import { inject, InjectorToken } from '@keeb-cad/di'
import { AsyncResult, InvariantError, Option, Result } from '@keeb-cad/result'
import type { Rejection } from '@keeb-cad/schema'
import { createNanoEvents } from 'nanoevents'
import { shallowRef } from 'vue'

import { Invoke } from '../invoke/invoke'
import type { ActionFailure } from '../rejection/types'
import type { CancelReason, FlowDraft, FlowEntry, FlowHandle, FlowsEvents, OpenFlow } from './types'

export class Flows implements Disposable {
  readonly events: Subscribable<FlowsEvents>

  constructor() {
    this.events = this.#emitter
  }

  // Bottom first: the last is the top.
  get stack(): readonly OpenFlow[] {
    return this.#stack.value
  }

  get top(): Option<OpenFlow> {
    return Option.fromNullable(this.#stack.value.at(-1))
  }

  start<H extends FlowHandle>(handle: H, draft: FlowDraft<H>): FlowEntry<H> {
    // Resolved now, so a flow missing its registerFlow throws before anything runs.
    this.#injector.resolve(handle)
    this.#cancel(this.#stack.value, 'replaced')
    const entry: FlowEntry<H> = { id: this.#nextId++, handle }
    this.#stack.value = [
      ...this.#stack.value,
      { entry, draft, availability: this.#available(entry, draft) },
    ]
    this.#emitter.emit('flow', { kind: 'started', entry })
    return entry
  }

  update<H extends FlowHandle>(entry: FlowEntry<H>, draft: FlowDraft<H>): void {
    if (!this.#isIdleTop(entry)) return
    this.#replaceTop({ entry, draft, availability: this.#available(entry, draft) })
  }

  finish(entry: FlowEntry): AsyncResult<void, Rejection | ActionFailure> {
    const open = this.top.getOrUndefined()
    return open === undefined || !this.#isIdleTop(entry)
      ? AsyncResult.err({ kind: 'unavailable', command: entry.handle.finishesWith.id })
      : AsyncResult._fromPromiseOfResult(this.#finishOpen(open))
  }

  cancel(entry: FlowEntry): void {
    if (!this.#isIdleTop(entry)) return
    this.#stack.value = this.#stack.value.slice(0, -1)
    this.#emitter.emit('flow', { kind: 'cancelled', entry, reason: 'cancel' })
  }

  [Symbol.dispose](): void {
    this.#stopWatching()
  }

  readonly #emitter: TypedEmitter<FlowsEvents> = createNanoEvents<FlowsEvents>()
  readonly #store = inject(DesignStore)
  readonly #invoke = inject(Invoke)
  readonly #injector = inject(InjectorToken)
  readonly #stack = shallowRef<readonly OpenFlow[]>([])
  #nextId = 1
  // The entry whose finish runs: its own commit must not re-ask it.
  #pending: number | undefined
  readonly #stopWatching = this.#store.events.on('commit', (event) => {
    this.#committed(event)
  })

  #committed(event: CommitEvent): void {
    if (event.kind === 'whole') {
      this.#cancel(this.#stack.value, 'design-replaced')
      return
    }
    const open = this.top.getOrUndefined()
    if (open === undefined || open.entry.id === this.#pending) return
    this.#replaceTop({ ...open, availability: this.#available(open.entry, open.draft) })
  }

  // Reported top first, as each would pop.
  #cancel(cancelled: readonly OpenFlow[], reason: CancelReason): void {
    if (cancelled.length === 0) return
    this.#stack.value = this.#stack.value.filter((open) => !cancelled.includes(open))
    for (const { entry } of cancelled.toReversed()) {
      this.#emitter.emit('flow', { kind: 'cancelled', entry, reason })
    }
  }

  // Async so a throwing run still clears #pending; the run itself starts synchronously.
  async #finishOpen(open: OpenFlow): Promise<Result<void, Rejection | ActionFailure>> {
    const { entry } = open
    this.#pending = entry.id
    let settled: Result<void, Rejection | ActionFailure>
    try {
      settled = await this.#run(open)
    } finally {
      if (this.#pending === entry.id) this.#pending = undefined
    }
    settled.match({
      ok: () => {
        this.#finished(open)
      },
      err: (error) => {
        if (this.#isTop(entry)) this.#replaceTop({ ...open, availability: Result.err(error) })
      },
    })
    return settled
  }

  #finished(open: OpenFlow): void {
    if (!this.#isTop(open.entry)) return
    const { handle } = open.entry
    this.#stack.value = this.#stack.value.slice(0, -1)
    this.#emitter.emit('flow', { kind: 'finished', entry: open.entry })
    const input = parse(handle.finishesWith.input, open.draft).match({
      ok: (parsed) => parsed,
      err: () => {
        throw new InvariantError(`The draft that finished "${handle.name}" no longer parses.`)
      },
    })
    this.#injector.resolve(handle).finished?.(input)
  }

  #run({ entry, draft }: OpenFlow): AsyncResult<void, Rejection | ActionFailure> {
    const { finishesWith } = entry.handle
    // The branch only picks invoke's overload; registerFlow refuses an action failing with
    // anything but an ActionFailure.
    return finishesWith.kind === 'command'
      ? this.#invoke.invoke(finishesWith, draft)
      : (this.#invoke.invoke(finishesWith, draft) as AsyncResult<void, Rejection | ActionFailure>)
  }

  #available({ handle }: FlowEntry, draft: unknown): Result<void, Rejection> {
    return this.#invoke.available(handle.finishesWith, draft)
  }

  #isTop(entry: FlowEntry): boolean {
    return this.#stack.value.at(-1)?.entry.id === entry.id
  }

  #isIdleTop(entry: FlowEntry): boolean {
    return this.#isTop(entry) && this.#pending !== entry.id
  }

  #replaceTop(open: OpenFlow): void {
    this.#stack.value = [...this.#stack.value.slice(0, -1), open]
  }
}
