import * as hotkeys from '@zag-js/hotkeys'

import { assertValidHotkey } from './assert-valid-hotkey'
import { matchesTypedLetter } from './matches-typed-letter'
import type { HotkeyEntry } from './types'

/** One zag hotkey store that reports each matched entry's id. */
export class HotkeyLayer {
  readonly #store: hotkeys.HotkeyStore
  readonly #onHotkey: (id: string) => void

  constructor(target: hotkeys.HotkeyTarget, onHotkey: (id: string) => void) {
    this.#store = hotkeys.createHotkeyStore({ target })
    this.#onHotkey = onHotkey
  }

  replaceHotkeys(entries: readonly HotkeyEntry[]): void {
    for (const { hotkey } of entries) assertValidHotkey(hotkey)
    const platform = hotkeys.getPlatform()
    this.#store.clear()
    this.#store.register(entries.map((entry) => this.#command(entry, platform)))
  }

  destroy(): void {
    this.#store.destroy()
  }

  #command({ id, hotkey }: HotkeyEntry, platform: hotkeys.Platform): hotkeys.CommandDefinition {
    const [key = ''] = hotkeys.parseHotkey(hotkey, platform).keys
    return {
      id,
      hotkey,
      // zag would prevent the default of a keystroke the letter guard then drops.
      options: { preventDefault: false, enableOnFormTags: false },
      action: (event) => {
        if (!matchesTypedLetter(key, event)) return
        event.preventDefault()
        this.#onHotkey(id)
      },
    }
  }
}
