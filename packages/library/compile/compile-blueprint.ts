import { readFileSync } from 'node:fs'
import { BLUEPRINT_API_VERSION } from '@keeb-cad/blueprint'
import { runnerImport } from 'vite'

import { checkTypes } from './check-types'
import { findVisibleUses } from './find-visible-uses'
import { inlineScript } from './inline-script'
import type { CompiledBlueprint } from './types'
import { validateDeclaration } from './validate-declaration'

const withoutRun = (lane: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(lane).filter(([field]) => field !== 'run'))

const stampedDeclaration = (source: Record<string, unknown>): unknown => {
  const lanes = (source.lanes ?? {}) as Record<string, Record<string, unknown>>
  return {
    ...source,
    apiVersion: BLUEPRINT_API_VERSION,
    lanes: Object.fromEntries(
      Object.entries(lanes).map(([stage, lane]) => [stage, withoutRun(lane)]),
    ),
  }
}

export async function compileBlueprint(file: string): Promise<CompiledBlueprint> {
  const { module } = await runnerImport<{ default: Record<string, unknown> }>(file, {
    configFile: false,
    logLevel: 'silent',
  })
  const declaration = validateDeclaration(file, stampedDeclaration(module.default))
  checkTypes(file)
  const script = await inlineScript(file)
  return { declaration, script, visibleUses: findVisibleUses(readFileSync(file, 'utf8')) }
}
