import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'

import { groupDeclarations } from '../src/library-data/group-declarations'
import { compileLibrary } from './compile-library'

const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name)

// A real tsc program plus a real Vite build per source, each a few hundred milliseconds or more.
const SLOW_BUILD_TIMEOUT = 30_000

const sortedKeys = (value: object) => Object.keys(value).toSorted((a, b) => a.localeCompare(b))

const evaluate = (script: string) =>
  new Function(`'use strict';\nreturn (${script}\n)`)() as {
    lanes: { parts: (args: { inputs: { width: number } }) => unknown }
  }

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'compile-library-'))
  onTestFinished(() => {
    rmSync(dir, { recursive: true, force: true })
  })
  return dir
}

describe('compileLibrary', { timeout: SLOW_BUILD_TIMEOUT }, () => {
  it.each([
    ['a quantity with no unit', 'no-unit', 'inputs.width.unit'],
    ['an option with no options', 'no-options', 'inputs.style.options'],
  ])('fails naming the input on %s', async (_role, name, expected) => {
    await expect(compileLibrary({ sourcesDir: fixture(name), outDir: tempDir() })).rejects.toThrow(
      expected,
    )
  })

  it('fails naming the file when the type check fails', async () => {
    await expect(
      compileLibrary({ sourcesDir: fixture('type-error'), outDir: tempDir() }),
    ).rejects.toThrow(path.join(fixture('type-error'), 'source.ts'))
  })

  it('builds an empty library from no sources', async () => {
    const outDir = tempDir()

    await expect(compileLibrary({ sourcesDir: tempDir(), outDir })).resolves.toEqual([])
    expect(readdirSync(outDir)).toEqual([])
  })

  it('splits a source into a declaration and a script with the same lane names', async () => {
    const compiled = await compileLibrary({ sourcesDir: fixture('two-lanes'), outDir: tempDir() })

    const laneNames = compiled.map(({ script, declaration }) => ({
      script: sortedKeys(evaluate(script).lanes),
      declaration: sortedKeys(declaration.lanes),
    }))

    expect(laneNames).toEqual([{ script: ['parts', 'shapes'], declaration: ['parts', 'shapes'] }])
  })

  it('makes a self-contained script that runs its local helper', async () => {
    const compiled = await compileLibrary({ sourcesDir: fixture('two-lanes'), outDir: tempDir() })

    const runs = compiled.map(({ script }) =>
      evaluate(script).lanes.parts({ inputs: { width: 18 } }),
    )

    expect(compiled).toEqual([
      expect.objectContaining({ script: expect.not.stringMatching(/\bimport\b/) as unknown }),
    ])
    expect(runs).toEqual([{ outputs: { rectangle: { w: 9, h: 9 } }, problems: [] }])
  })

  it('writes both versions, whose declarations group under one id', async () => {
    const outDir = tempDir()

    await compileLibrary({ sourcesDir: fixture('two-versions'), outDir })

    const read = (version: number) =>
      JSON.parse(readFileSync(path.join(outDir, 'twice', `${String(version)}.json`), 'utf8'))
    expect(groupDeclarations([read(1), read(2)])).toEqual({
      'lib:blueprint/twice': { 1: read(1), 2: read(2) },
    })
  })

  it('stamps the app API version', async () => {
    const compiled = await compileLibrary({ sourcesDir: fixture('two-lanes'), outDir: tempDir() })

    expect(compiled).toMatchObject([{ declaration: { apiVersion: 1 } }])
  })
})
