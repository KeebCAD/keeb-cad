import type { HotkeyLayer } from '@keeb-cad/ui'

import type { EntryHandle } from '../invoke/types'

export type ShortcutTarget = ConstructorParameters<typeof HotkeyLayer>[0]

export interface Shortcut {
  readonly hotkey: string
  readonly handle: EntryHandle
  readonly invoke: () => PromiseLike<unknown>
}
