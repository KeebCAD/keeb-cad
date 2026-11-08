import { Option } from '@keeb-cad/result'

export class HandleTable {
  add(value: unknown): number {
    const handle = this.#entries.size + 1
    this.#entries.set(handle, value)
    return handle
  }

  get(handle: number): Option<unknown> {
    return this.#entries.has(handle) ? Option.some(this.#entries.get(handle)) : Option.none()
  }

  free(): void {
    this.#entries.clear()
  }

  readonly #entries = new Map<number, unknown>()
}
