// Internal: reading the committed Corney Island Ergogen output. Not re-exported.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

export const FIXTURE_DIR = new URL('../corney-island/ergogen/', import.meta.url)

export function readFixture(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, FIXTURE_DIR)), 'utf8')
}

export function readYaml(relative: string): unknown {
  return parse(readFixture(relative))
}
