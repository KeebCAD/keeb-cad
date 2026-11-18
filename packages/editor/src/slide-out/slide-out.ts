import { Option } from '@keeb-cad/result'
import { shallowRef } from 'vue'

import type { SlideOutTab } from './types'

export class SlideOut {
  get isOpen(): boolean {
    return this.#open.value
  }

  // The open tab while open; the last-used one while closed, Tree before any.
  get tab(): SlideOutTab {
    return this.#tab.value
  }

  // The element focused when it opened; none when that was the page itself.
  get invoker(): Option<HTMLElement> {
    return Option.fromNullable(this.#invoker)
  }

  // A switch while open keeps the invoker, so close still returns focus to where it was on open.
  open(tab: SlideOutTab = this.#tab.value): void {
    this.#tab.value = tab
    if (this.#open.value) return
    const focused = document.activeElement
    this.#invoker =
      focused instanceof HTMLElement && focused !== document.body ? focused : undefined
    this.#open.value = true
  }

  close(): void {
    this.#open.value = false
  }

  readonly #open = shallowRef(false)
  readonly #tab = shallowRef<SlideOutTab>('tree')
  #invoker: HTMLElement | undefined
}
