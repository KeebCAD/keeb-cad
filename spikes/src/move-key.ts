// The one-key-move variant for entries 7 and 10: shift one key's footprints rigidly, in the text.
import { CORNEY_KEYS } from './corney'

export interface Delta {
  dx: number
  dy: number
}

/** Index just past the list that opens at `open`, skipping quoted strings. */
function closeOf(text: string, open: number): number {
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
function* childLists(text: string, open: number, close: number): Generator<[number, number]> {
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

/** Each top-level footprint's reference and its [start, end) span in the text. */
export function footprintSpans(pcbText: string): Array<{ reference: string; start: number; end: number }> {
  const root = pcbText.indexOf('(')
  const spans: Array<{ reference: string; start: number; end: number }> = []
  for (const [start, end] of childLists(pcbText, root, closeOf(pcbText, root))) {
    if (!/^\(footprint[\s"]/.test(pcbText.slice(start, start + 11))) continue
    const reference = /\(property\s+"Reference"\s+"([^"]*)"/.exec(pcbText.slice(start, end))?.[1]
    if (reference !== undefined) spans.push({ reference, start, end })
  }
  return spans
}

/** The KiCad references that make up key n (1-based) of `keyCount`. */
export function keyReferences(n: number, keyCount: number): string[] {
  return [`S${n}`, `D${n}`, `D${n + keyCount}`, `LED${n}`]
}

/**
 * Returns `pcbText` with every footprint of `key` (S_n, D_n, D_{n+21} and, where present,
 * LED_n) moved by `delta`. Only the footprints' own `(at x y r)` change; pads are local, so they
 * follow. Throws on a key not in points.yaml, or if S_n, D_n or D_{n+21} is missing.
 */
export function moveKey(
  pcbText: string,
  key: string,
  delta: Delta,
  keys: readonly string[] = CORNEY_KEYS,
): string {
  const index = keys.indexOf(key)
  if (index === -1) throw new Error(`Unknown key: ${key}`)
  const refs = keyReferences(index + 1, keys.length)
  const required = new Set(refs.slice(0, 3))

  const edits: Array<{ start: number; end: number; text: string }> = []
  for (const { reference, start: open, end: close } of footprintSpans(pcbText)) {
    if (!refs.includes(reference)) continue
    const at = [...childLists(pcbText, open, close)].find(([s]) => /^\(at\s/.test(pcbText.slice(s, s + 4)))
    if (!at) throw new Error(`Footprint ${reference} has no (at …)`)
    const [, x, y, rest] = /^\(at\s+(\S+)\s+(\S+)(.*)\)$/s.exec(pcbText.slice(at[0], at[1])) ?? []
    if (x === undefined || y === undefined) throw new Error(`Footprint ${reference}: unreadable (at …)`)
    edits.push({ start: at[0], end: at[1], text: `(at ${Number(x) + delta.dx} ${Number(y) + delta.dy}${rest})` })
    required.delete(reference)
  }
  if (required.size > 0) throw new Error(`Key ${key}: no footprint ${[...required].join(', ')}`)

  let out = pcbText
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  return out
}
