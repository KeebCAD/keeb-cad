import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { aBlueprintId } from '@keeb-cad/schema/testing'
import { describe, expect, it, onTestFinished } from 'vitest'

import { compileLibrary } from './compile-library'

const CHOC_KEY = aBlueprintId('lib:blueprint/choc-key')
const SLOW_BUILD_TIMEOUT = 30_000

const sourcesDir = path.join(import.meta.dirname, '..', 'blueprints-src')

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'choc-key-'))
  onTestFinished(() => {
    rmSync(dir, { recursive: true, force: true })
  })
  return dir
}

const evaluate = (script: string) =>
  new Function(`'use strict';\nreturn (${script}\n)`)() as {
    lanes: { parts: () => unknown }
  }

describe('lib:blueprint/choc-key v1', { timeout: SLOW_BUILD_TIMEOUT }, () => {
  it('compiles to a parts lane answering one 18 by 18 mm rectangle', async () => {
    const compiled = await compileLibrary({ sourcesDir, outDir: tempDir() })

    const key = compiled.filter(({ declaration }) => declaration.id === CHOC_KEY)

    expect(
      key.map(({ declaration, script }) => ({
        version: declaration.version,
        outputs: declaration.lanes.parts?.outputs.map(({ role, count }) => ({ role, count })),
        run: evaluate(script).lanes.parts(),
      })),
    ).toEqual([
      {
        version: 1,
        outputs: [{ role: 'rectangle', count: 'one' }],
        run: { outputs: { rectangle: { w: 18, h: 18 } }, problems: [] },
      },
    ])
  })
})
