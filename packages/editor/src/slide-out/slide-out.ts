import { Option } from '@keeb-cad/result'
import { shallowRef } from 'vue'

export class SlideOut {
  get isOpen(): boolean {
    return this.#open.value
  }

  // The element focused when it opened; none when that was the page itself.
  get invoker(): Option<HTMLElement> {
    return Option.fromNullable(this.#invoker)
  }

  open(): void {
    const focused = document.activeElement
    this.#invoker =
      focused instanceof HTMLElement && focused !== document.body ? focused : undefined
    this.#open.value = true
  }

  close(): void {
    this.#open.value = false
  }

  readonly #open = shallowRef(false)
  #invoker: HTMLElement | undefined
}
