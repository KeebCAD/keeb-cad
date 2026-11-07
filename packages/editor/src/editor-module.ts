import type { Module } from '@keeb-cad/di'

import { Invoke } from './invoke/invoke'
import { ShortcutRegistry } from './shortcuts/shortcut-registry'

export const editorModule: Module = {
  register(container) {
    container.register(Invoke).useClass(Invoke)
    container.register(ShortcutRegistry).useClass(ShortcutRegistry).eager()
  },
}
