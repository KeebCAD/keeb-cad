import type { Endpoint } from '../endpoint/types'
import { assertPlain } from '../sending/assert-plain'
import type { DispatcherOptions, Handlers, Stamped } from './types'

export class Dispatcher {
  constructor({ designKinds, wholeKind }: DispatcherOptions) {
    this.#designKinds = designKinds
    this.#wholeKind = wholeKind
  }

  send<M extends Stamped>(
    endpoint: Endpoint,
    message: M,
    transfer: readonly Transferable[] = [],
  ): void {
    assertPlain(message)
    endpoint.postMessage(message, { transfer: [...transfer] })
    if (this.#designKinds.includes(message.kind)) this.#latest = message.seq
  }

  // Returns the call that stops listening.
  listen<M extends Stamped>(endpoint: Endpoint, handlers: Handlers<M>): () => void {
    const onMessage = (event: MessageEvent) => {
      const message = event.data as M
      const handler = Object.hasOwn(handlers, message.kind)
        ? (handlers[message.kind as M['kind']] as (message: M) => void)
        : undefined
      // Dropped before the gate, so a kind this side doesn't receive never moves the latest.
      if (handler === undefined || !this.#admit(message)) return
      handler(message)
    }
    endpoint.addEventListener('message', onMessage)
    // A MessagePort delivers nothing to an added listener until it is started.
    endpoint.start?.()
    return () => endpoint.removeEventListener('message', onMessage)
  }

  restart(epoch: number): void {
    this.#epoch = epoch
    this.#latest = 0
  }

  readonly #designKinds: readonly string[]
  readonly #wholeKind: string
  #epoch: number | undefined
  #latest = 0

  #admit(message: Stamped): boolean {
    // A receiver never restarted takes its epoch from the first whole value it is sent.
    if (this.#epoch === undefined && message.kind === this.#wholeKind) this.restart(message.epoch)
    const isDesignKind = this.#designKinds.includes(message.kind)
    if (message.epoch !== this.#epoch) return false
    if (!isDesignKind) return message.seq >= this.#latest
    if (message.seq <= this.#latest) return false
    this.#latest = message.seq
    return true
  }
}
