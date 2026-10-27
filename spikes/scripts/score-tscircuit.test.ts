// The matrix's "No kicad-cli" row for `score:tscircuit`: it fails before routing, naming the
// setup command. Runs the real script under Node with a PATH that holds only `node`.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const bin = mkdtempSync(join(tmpdir(), 'score-tscircuit-no-cli-'))
symlinkSync(process.execPath, join(bin, 'node'))
afterAll(() => rmSync(bin, { recursive: true, force: true }))

describe('score:tscircuit without kicad-cli', () => {
  it('exits non-zero and names the setup command', () => {
    const r = spawnSync(
      join(bin, 'node'),
      ['--import', join(here, 'ts-resolve.mjs'), join(here, 'score-tscircuit.ts')],
      { encoding: 'utf8', env: { PATH: bin, HOME: tmpdir() }, cwd: join(here, '..') },
    )
    expect(r.error).toBeUndefined()
    expect(r.status).not.toBe(0)
    expect(r.stderr).toContain('sudo pacman -S kicad')
    expect(r.stderr).toContain('kicad-cli is not available on PATH')
    expect(r.stdout).not.toContain('tscircuit 0')
  }, 30_000)
})
