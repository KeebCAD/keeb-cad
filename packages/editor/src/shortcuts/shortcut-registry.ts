import { actions, commands, findDuplicateIds } from '@keeb-cad/design'
import { inject } from '@keeb-cad/di'
import { InvariantError } from '@keeb-cad/result'
import { assertValidHotkey, HotkeyLayer } from '@keeb-cad/ui'

import { Invoke } from '../invoke/invoke'
import { uiActions } from '../ui-actions/tokens'
import { DuplicateHandleIdError } from './duplicate-handle-id-error'
import type { Shortcut, ShortcutTarget } from './types'

export class ShortcutRegistry implements Disposable {
  constructor() {
    // One list per token, so each call picks its kind's invoke overload.
    const handles = [
      ...this.#commands.map((handle) => ({ handle, invoke: () => this.#invoke.invoke(handle) })),
      ...this.#actions.map((handle) => ({ handle, invoke: () => this.#invoke.invoke(handle) })),
      ...this.#uiActions.map((handle) => ({ handle, invoke: () => this.#invoke.invoke(handle) })),
    ]
    const duplicates = findDuplicateIds(handles.map(({ handle }) => handle.id))
    if (duplicates.length > 0) throw new DuplicateHandleIdError(duplicates)
    for (const { handle, invoke } of handles) {
      for (const [index, hotkey] of (handle.hotkeys ?? []).entries()) {
        assertValidHotkey(hotkey)
        // zag keys its entries by id, so each of a handle's hotkeys needs its own.
        this.#shortcuts.set(`${handle.id}#${index}`, { hotkey, invoke })
      }
    }
  }

  listen(target: ShortcutTarget): void {
    if (this.#layer !== undefined) {
      throw new InvariantError('The shortcut registry is already listening.')
    }
    const layer = new HotkeyLayer(target, (id) => this.#run(id))
    layer.replaceHotkeys([...this.#shortcuts].map(([id, { hotkey }]) => ({ id, hotkey })))
    this.#layer = layer
  }

  stop(): void {
    this.#layer?.destroy()
    this.#layer = undefined
  }

  [Symbol.dispose](): void {
    this.stop()
  }

  readonly #commands = inject(commands)
  readonly #actions = inject(actions)
  readonly #uiActions = inject(uiActions)
  readonly #invoke = inject(Invoke)
  readonly #shortcuts = new Map<string, Shortcut>()
  #layer: HotkeyLayer | undefined

  // A refusal is dropped: notices for a refused hotkey are not shown yet.
  #run(id: string): void {
    const shortcut = this.#shortcuts.get(id)
    if (shortcut === undefined) throw new InvariantError(`No shortcut is registered as "${id}".`)
    void shortcut.invoke()
  }
}
