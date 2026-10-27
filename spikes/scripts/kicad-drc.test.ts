// The matrix's "No kicad-cli" row: the cross-check fails loudly, naming the setup command, and is
// never skipped. Runs the real script under Node with a PATH that holds only `node`.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const bin = mkdtempSync(join(tmpdir(), 'kicad-drc-no-cli-'))
symlinkSync(process.execPath, join(bin, 'node'))
afterAll(() => rmSync(bin, { recursive: true, force: true }))

describe('kicad-drc without kicad-cli', () => {
  it('exits non-zero and names the setup command', () => {
    const r = spawnSync(
      join(bin, 'node'),
      ['--import', join(here, 'ts-resolve.mjs'), join(here, 'kicad-drc.ts')],
      { encoding: 'utf8', env: { PATH: bin, HOME: tmpdir() }, cwd: join(here, '..') },
    )
    expect(r.error).toBeUndefined()
    expect(r.status).not.toBe(0)
    expect(r.stderr).toContain('sudo pacman -S kicad')
    expect(r.stderr).toContain('kicad-cli is not available on PATH')
    expect(r.stdout).not.toContain('kicad-cli 1')
  })
})
