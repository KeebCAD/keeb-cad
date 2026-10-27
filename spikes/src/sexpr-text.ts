// Offsets into s-expression text, for edits that leave every other byte as it was.

/** Index just past the list that opens at `open`, skipping quoted strings. */
export function closeOf(text: string, open: number): number {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++
    } else if (c === '(') depth++
    else if (c === ')' && --depth === 0) return i + 1
  }
  throw new SyntaxError(`List at offset ${open} not closed`)
}

/** Offsets of the direct child lists of the list spanning [open, close). */
export function* childLists(text: string, open: number, close: number): Generator<[number, number]> {
  for (let i = open + 1; i < close - 1; i++) {
    const c = text[i]
    if (c === '"') {
      for (i++; i < close && text[i] !== '"'; i++) if (text[i] === '\\') i++
    } else if (c === '(') {
      const end = closeOf(text, i)
      yield [i, end]
      i = end - 1
    }
  }
}
