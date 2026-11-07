import * as hotkeys from '@zag-js/hotkeys'

import { assertValidHotkey } from './assert-valid-hotkey'
import type { Platform } from './types'

export function formatHotkey(hotkey: string, platform: Platform): string {
  assertValidHotkey(hotkey)
  return hotkeys.formatHotkey(
    hotkey,
    platform === 'mac'
      ? { platform, style: 'symbols', separator: '' }
      : { platform, style: 'text', separator: '+' },
  )
}
