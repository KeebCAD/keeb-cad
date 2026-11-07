export function press(letter: string): void {
  const init: KeyboardEventInit = {
    key: letter.toLowerCase(),
    code: `Key${letter.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
  }
  document.dispatchEvent(new KeyboardEvent('keydown', init))
  document.dispatchEvent(new KeyboardEvent('keyup', init))
}
