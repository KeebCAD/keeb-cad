import type { SpawnedWorker } from '../model-worker/types'

// Stands in for a spawned model worker: records what main sends it, and posts, crashes or fails
// to deserialize on the test's say-so.
export class FakeWorker implements SpawnedWorker {
  readonly received: unknown[] = []
  terminated = false

  postMessage(message: unknown): void {
    this.received.push(structuredClone(message))
  }

  addEventListener(type: string, listener: (event: never) => void): void {
    this.#target.addEventListener(type, listener as EventListener)
  }

  removeEventListener(type: string, listener: (event: never) => void): void {
    this.#target.removeEventListener(type, listener as EventListener)
  }

  terminate(): void {
    this.terminated = true
  }

  post(message: unknown): void {
    this.#target.dispatchEvent(new MessageEvent('message', { data: message }))
  }

  // Returns false when a listener cancelled the error.
  crash(): boolean {
    return this.#target.dispatchEvent(new Event('error', { cancelable: true }))
  }

  failToDeserialize(): void {
    this.#target.dispatchEvent(new MessageEvent('messageerror'))
  }

  readonly #target = new EventTarget()
}
