import type { KeyPress } from './types'

export function press(letter: string): void {
  pressKey({ key: letter.toLowerCase(), code: `Key${letter.toUpperCase()}` })
}

export function pressKey({ key, code, shift = false }: KeyPress): void {
  const init: KeyboardEventInit = { key, code, shiftKey: shift, bubbles: true, cancelable: true }
  document.dispatchEvent(new KeyboardEvent('keydown', init))
  document.dispatchEvent(new KeyboardEvent('keyup', init))
}
