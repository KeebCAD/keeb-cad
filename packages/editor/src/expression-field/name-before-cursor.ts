// The parameter name being typed: a letter, then letters, digits or _, ending at the cursor. A run
// that starts with a digit is a number and its unit (`3mm`), not a name.
export function nameBeforeCursor(text: string, cursor: number): string | undefined {
  const run = /[\p{L}0-9_]*$/u.exec(text.slice(0, cursor))?.[0] ?? ''
  return /^\p{L}/u.test(run) ? run : undefined
}
