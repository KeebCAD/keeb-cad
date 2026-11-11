import type { KeyPress } from './types'

export function press(letter: string): void {
  pressKey({ key: letter.toLowerCase(), code: `Key${letter.toUpperCase()}` })
}

// Returns the keydown, so a test can read whether a handler claimed the key.
export function pressKey({ key, code, shift = false, ctrl = false }: KeyPress): KeyboardEvent {
  const init: KeyboardEventInit = {
    key,
    code,
    shiftKey: shift,
    ctrlKey: ctrl,
    bubbles: true,
    cancelable: true,
  }
  const keydown = new KeyboardEvent('keydown', init)
  document.dispatchEvent(keydown)
  document.dispatchEvent(new KeyboardEvent('keyup', init))
  return keydown
}
