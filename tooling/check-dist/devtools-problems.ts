import { fileURLToPath } from 'node:url'

import { devtoolsPluginId } from '../../packages/editor/src/devtools/plugin-id.ts'
import { filesContaining } from './files-containing.ts'

export function devtoolsProblems(): string[] {
  const dist = fileURLToPath(new URL('../../app/dist', import.meta.url))
  return filesContaining(dist, devtoolsPluginId).map(
    (file) => `Devtools code in the production build: ${file}`,
  )
}
