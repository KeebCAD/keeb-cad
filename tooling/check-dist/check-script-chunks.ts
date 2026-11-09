import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Plugin } from 'vite'

import { filesContaining } from './files-containing.ts'
import type { ViteManifest } from './types.ts'

const APP = fileURLToPath(new URL('../../app', import.meta.url))
const PROBES = fileURLToPath(new URL('fixtures/probe', import.meta.url))
const COMPILED_GLOB = '../../compiled/**/*.js'
const FIRST_MARKER = 'keeb-cad-probe-script-version-one'
const SECOND_MARKER = 'keeb-cad-probe-script-version-two'

/** Points `library/worker`'s script glob at the probes, on both graphs, so a main import shows. */
export function redirectGlobToProbes(): Plugin {
  return {
    name: 'check-dist:redirect-glob-to-probes',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?', 1)[0]?.endsWith('library-data/load-script.ts')) return
      if (!code.includes(COMPILED_GLOB)) this.error(`No compiled-script glob in ${id}`)
      const probes = path.relative(path.dirname(id), PROBES).split(path.sep).join('/')
      return code.replace(COMPILED_GLOB, `${probes}/*.js`)
    },
  }
}

function filesTheMainEntryLoads(outDir: string): string[] {
  const manifest = JSON.parse(
    readFileSync(path.join(outDir, '.vite/manifest.json'), 'utf8'),
  ) as ViteManifest
  const seen = new Set<string>()
  const visit = (key: string): void => {
    if (seen.has(key)) return
    seen.add(key)
    const chunk = manifest[key]
    for (const next of [...(chunk?.imports ?? []), ...(chunk?.dynamicImports ?? [])]) visit(next)
  }
  visit('index.html')
  return [...seen].flatMap((key) => {
    const file = manifest[key]?.file
    return file === undefined ? [] : [path.join(outDir, file)]
  })
}

function problemsIn(outDir: string): string[] {
  const hasMarker = (file: string) => {
    const text = readFileSync(file, 'utf8')
    return text.includes(FIRST_MARKER) || text.includes(SECOND_MARKER)
  }
  const inMain = filesTheMainEntryLoads(outDir).filter((file) => hasMarker(file))
  const workerFiles = readdirSync(path.join(outDir, 'assets'))
    .filter((name) => name.startsWith('model.worker'))
    .map((name) => path.join(outDir, 'assets', name))
  const inWorker = workerFiles.filter((file) => hasMarker(file))
  const secondChunks = filesContaining(outDir, SECOND_MARKER)
  const firstChunks = new Set(filesContaining(outDir, FIRST_MARKER))
  return [
    ...inMain.map((file) => `Blueprint script in a file main loads: ${file}`),
    ...(workerFiles.length === 0 ? ['No model worker file in the build.'] : []),
    ...inWorker.map((file) => `Blueprint script inlined in the worker file: ${file}`),
    ...(secondChunks.length === 1 && !firstChunks.has(secondChunks[0] ?? '')
      ? []
      : [`Second version's script is not alone in one chunk: ${secondChunks.join(', ')}`]),
  ]
}

export async function checkScriptChunks(): Promise<string[]> {
  const outDir = mkdtempSync(path.join(tmpdir(), 'check-script-chunks-'))
  try {
    await build({
      root: APP,
      configFile: path.join(APP, 'vite.config.ts'),
      logLevel: 'silent',
      plugins: [redirectGlobToProbes()],
      worker: { plugins: () => [redirectGlobToProbes()] },
      build: { outDir, emptyOutDir: true, manifest: true },
    })
    return problemsIn(outDir)
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
}
