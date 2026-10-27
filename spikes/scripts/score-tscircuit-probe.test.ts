// The matrix's "Outbound request" row for `score:tscircuit` and `score:custom`: with `--probe` the
// page's worker fetches https://example.com/; the browser-level block (shared, in score.ts) must
// fail the run and name the URL.
// The probe scores nothing, so it needs no kicad-cli. It needs dist/, built here first.
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { beforeAll, describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const spikes = join(here, '..')

beforeAll(async () => {
  await build({ root: spikes, logLevel: 'silent' })
}, 60_000)

describe.each(['score-tscircuit.ts', 'score-custom.ts'])('%s with an outbound request', (script) => {
  it('exits non-zero and names the URL', () => {
    const r = spawnSync(process.execPath, ['--import', join(here, 'ts-resolve.mjs'), join(here, script), '--probe'], {
      encoding: 'utf8',
      cwd: spikes,
      timeout: 60_000,
    })
    expect(r.error).toBeUndefined()
    expect(r.status).not.toBe(0)
    expect(r.stderr).toContain('outbound request')
    expect(r.stderr).toContain('https://example.com/')
  }, 90_000)
})
