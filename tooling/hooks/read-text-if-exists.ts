import { readFileSync } from 'node:fs'

/** The file's text, or '' when there is none to read. */
export function readTextIfExists(filePath: string | undefined): string {
  if (filePath === undefined) return ''
  try {
    return readFileSync(filePath, 'utf8')
  } catch {
    // A Write may be creating the file.
    return ''
  }
}
