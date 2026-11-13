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

const KEYCAP_HEIGHT = 18

const evaluate = (script: string) =>
  new Function(`'use strict';\nreturn (${script}\n)`)() as {
    lanes: { parts: (args: unknown) => unknown }
  }

async function compiledChocKey() {
  const compiled = await compileLibrary({ sourcesDir, outDir: tempDir() })
  return compiled.filter(({ declaration }) => declaration.id === CHOC_KEY)
}

describe('lib:blueprint/choc-key v1', { timeout: SLOW_BUILD_TIMEOUT }, () => {
  it('declares one rectangle output and a per-slot size input defaulting to 1u', async () => {
    const key = await compiledChocKey()

    expect(
      key.map(({ declaration }) => ({
        version: declaration.version,
        inputs: declaration.inputs,
        outputs: declaration.lanes.parts?.outputs.map(({ role, count }) => ({ role, count })),
      })),
    ).toEqual([
      {
        version: 1,
        inputs: {
          size: {
            kind: 'option',
            label: 'Size',
            options: ['1u', '1.5u'],
            default: '1u',
            perSlot: true,
          },
        },
        outputs: [{ role: 'rectangle', count: 'one' }],
      },
    ])
  })

  it.each([
    ['1u', 18],
    ['1.5u', 27],
  ])('answers the keycap rectangle for size %s', async (size, expectedWidth) => {
    const runs = (await compiledChocKey()).map(({ script }) =>
      evaluate(script).lanes.parts({ inputs: { size }, pulls: {}, queries: {} }),
    )

    expect(runs).toEqual([
      {
        outputs: { rectangle: { w: expectedWidth, h: KEYCAP_HEIGHT } },
        problems: [],
      },
    ])
  })
})
