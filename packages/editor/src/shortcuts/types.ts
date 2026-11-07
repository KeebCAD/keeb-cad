import type { HotkeyLayer } from '@keeb-cad/ui'

export type ShortcutTarget = ConstructorParameters<typeof HotkeyLayer>[0]

export interface Shortcut {
  readonly hotkey: string
  readonly invoke: () => PromiseLike<unknown>
}
