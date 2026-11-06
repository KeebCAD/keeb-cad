import { describe, expect, it } from 'vitest'

import { formatHotkey } from './format-hotkey'

describe('formatHotkey', () => {
  it.each([
    ['mod+K', 'mac', '⌘K'],
    ['mod+K', 'windows', 'Ctrl+K'],
    ['mod+K', 'linux', 'Ctrl+K'],
    ['mod+shift+S', 'mac', '⇧⌘S'],
    ['mod+shift+S', 'windows', 'Ctrl+Shift+S'],
    ['F1', 'mac', 'F1'],
    ['F1', 'windows', 'F1'],
  ] as const)('formats %s on %s as %s', (hotkey, platform, expected) => {
    expect(formatHotkey(hotkey, platform)).toBe(expected)
  })

  it.each([
    ['an empty hotkey', ''],
    ['a chord with no key', 'mod+'],
  ])('throws on %s', (_, hotkey) => {
    expect(() => formatHotkey(hotkey, 'linux')).toThrow(`Invalid hotkey "${hotkey}"`)
  })
})
