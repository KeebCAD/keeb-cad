import { useColorMode, useStorage } from '@vueuse/core'
import type { Ref } from 'vue'

import { isThemeChoice } from './theme-choice'
import { THEME_STORAGE_KEY } from './theme-storage-key'
import type { ThemeChoice } from './types'

export function useThemeChoice(): Ref<ThemeChoice> {
  // A stored value that is no choice reads as `auto`, so a stale key still follows the OS.
  const stored = useStorage<ThemeChoice>(THEME_STORAGE_KEY, 'auto', undefined, {
    serializer: { read: (raw) => (isThemeChoice(raw) ? raw : 'auto'), write: (choice) => choice },
  })
  return useColorMode<ThemeChoice>({
    attribute: 'data-theme',
    selector: 'html',
    storageRef: stored,
    emitAuto: true,
  })
}
