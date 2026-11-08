import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

export function filesContaining(dir: string, text: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`No folder to check: ${dir}`)
  }
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
  if (files.length === 0) throw new Error(`No files to check in: ${dir}`)
  return files
    .filter((file) => readFileSync(file).includes(text))
    .toSorted((a, b) => a.localeCompare(b))
}
