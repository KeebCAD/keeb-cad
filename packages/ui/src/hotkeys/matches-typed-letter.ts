const LATIN_LETTER = /^[a-z]$/i

/**
 * False when a letter hotkey's `key` meets a key that types another Latin letter. zag matches a
 * letter by `key` or by `code`, so on Dvorak the physical K key, which types `t`, would fire K
 * as well as T; a non-Latin character still matches by its physical position.
 */
export function matchesTypedLetter(hotkeyKey: string, event: KeyboardEvent): boolean {
  const bothLatin = LATIN_LETTER.test(hotkeyKey) && LATIN_LETTER.test(event.key)
  return !bothLatin || hotkeyKey.toLowerCase() === event.key.toLowerCase()
}
