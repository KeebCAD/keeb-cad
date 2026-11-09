import { existsSync, globSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { checkLibraryRules } from './check-library-rules'
import { compileBlueprint } from './compile-blueprint'
import type { CompiledBlueprint, CompileLibraryOptions } from './types'

const PREFIX = 'lib:blueprint/'

function writeCompiled(outDir: string, { declaration, script }: CompiledBlueprint): void {
  const folder = path.join(outDir, declaration.id.slice(PREFIX.length))
  mkdirSync(folder, { recursive: true })
  writeFileSync(path.join(folder, `${String(declaration.version)}.js`), script)
  writeFileSync(
    path.join(folder, `${String(declaration.version)}.json`),
    JSON.stringify(declaration, undefined, 2),
  )
}

export async function compileLibrary({
  sourcesDir,
  outDir,
}: CompileLibraryOptions): Promise<CompiledBlueprint[]> {
  const sources = existsSync(sourcesDir) ? globSync('**/*.ts', { cwd: sourcesDir }) : []
  const compiled: CompiledBlueprint[] = []
  for (const source of sources.toSorted((a, b) => a.localeCompare(b))) {
    compiled.push(await compileBlueprint(path.join(sourcesDir, source)))
  }
  const problems = checkLibraryRules(compiled)
  if (problems.length > 0) throw new Error(`Library rules failed:\n${problems.join('\n')}`)

  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  for (const blueprint of compiled) writeCompiled(outDir, blueprint)
  return compiled
}
