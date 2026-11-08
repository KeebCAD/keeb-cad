import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'

import { filesContaining } from './files-containing'

const needle = 'keeb-cad.devtools'

function tempFolder(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'check-dist-'))
  onTestFinished(() => {
    rmSync(dir, { recursive: true, force: true })
  })
  return dir
}

function folderWith(relativePath: string, text: string): { dir: string; file: string } {
  const dir = tempFolder()
  const file = path.join(dir, relativePath)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, text)
  return { dir, file }
}

describe('filesContaining', () => {
  it('lists nothing for files without the text', () => {
    const { dir } = folderWith('index.html', '<html></html>')

    expect(filesContaining(dir, needle)).toEqual([])
  })

  it('lists nothing for a nested file holding one character less than the text', () => {
    const { dir } = folderWith('assets/chunk.js', 'keeb-cad.devtool')

    expect(filesContaining(dir, needle)).toEqual([])
  })

  it('lists a nested chunk holding exactly the text', () => {
    const { dir, file } = folderWith('assets/chunk.js', `const id="${needle}"`)

    expect(filesContaining(dir, needle)).toEqual([file])
  })

  it('lists a file holding the text with more after it', () => {
    const { dir, file } = folderWith('index.js', `${needle}.services`)

    expect(filesContaining(dir, needle)).toEqual([file])
  })

  it('fails naming a folder that is missing', () => {
    const dir = path.join(tempFolder(), 'dist')

    expect(() => filesContaining(dir, needle)).toThrow(dir)
  })

  it('fails naming a folder that holds no files', () => {
    const dir = tempFolder()
    mkdirSync(path.join(dir, 'assets'))

    expect(() => filesContaining(dir, needle)).toThrow(dir)
  })
})
