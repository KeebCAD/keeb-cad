import * as hotkeys from '@zag-js/hotkeys'

import { assertValidHotkey } from './assert-valid-hotkey'
import { matchesTypedLetter } from './matches-typed-letter'
import type { HotkeyEntry } from './types'

export class HotkeyLayer {
  constructor(
    target: hotkeys.HotkeyTarget,
    onHotkey: (id: string) => boolean,
    isModalOpen: () => boolean,
  ) {
    this.#store = hotkeys.createHotkeyStore({ target })
    this.#onHotkey = onHotkey
    this.#isModalOpen = isModalOpen
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

  readonly #store: hotkeys.HotkeyStore
  readonly #onHotkey: (id: string) => boolean
  readonly #isModalOpen: () => boolean

  #command({ id, hotkey }: HotkeyEntry, platform: hotkeys.Platform): hotkeys.CommandDefinition {
    const parsed = hotkeys.parseHotkey(hotkey, platform)
    const [key = ''] = parsed.keys
    const alwaysClaimed = HotkeyLayer.#claimsBrowserShortcut(parsed, key)
    return {
      id,
      hotkey,
      // zag would prevent the default of a keystroke the letter guard then drops, and of one whose
      // entry can't run. It also turns form tags on for a modified chord unless told otherwise.
      options: { preventDefault: false, enableOnFormTags: false, enableOnContentEditable: false },
      action: (event) => {
        // An open modal keeps every key, Esc included, so nothing here may prevent it.
        if (this.#isModalOpen()) return
        if (!matchesTypedLetter(key, event)) return
        const ran = this.#onHotkey(id)
        if (ran || alwaysClaimed) event.preventDefault()
      },
    }
  }

  // The browser's own meaning of these (Ctrl+D bookmarks, Alt+Left goes Back) would otherwise fire
  // over the editor whenever the entry can't run.
  static #claimsBrowserShortcut(parsed: hotkeys.ParsedHotkey, key: string): boolean {
    return (
      parsed.ctrl === true ||
      parsed.meta === true ||
      (parsed.alt === true && key.startsWith('Arrow'))
    )
  }
}
