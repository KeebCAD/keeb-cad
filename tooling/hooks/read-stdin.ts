import { readFileSync } from 'node:fs'

/** The hook's JSON input, or an empty object when stdin is empty. */
export function readStdin<T>(): T {
  const text = readFileSync(0, 'utf8')
  return (text.trim() === '' ? {} : JSON.parse(text)) as T
}
