import * as hotkeys from '@zag-js/hotkeys'

/**
 * Throws on a hotkey zag's `validateHotkey` reports anything about. Its warnings count too: it
 * passes `mod+`, a chord with no key, with a warning only.
 */
export function assertValidHotkey(hotkey: string): void {
  const { errors, warnings } = hotkeys.validateHotkey(hotkey)
  const problems = [...errors, ...warnings]
  if (problems.length > 0) throw new Error(`Invalid hotkey "${hotkey}": ${problems.join('; ')}`)
}
