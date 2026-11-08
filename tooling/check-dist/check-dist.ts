import { fileURLToPath } from 'node:url'

import { devtoolsPluginId } from '../../packages/editor/src/devtools/plugin-id.ts'
import { filesContaining } from './files-containing.ts'

const offenders = filesContaining(
  fileURLToPath(new URL('../../app/dist', import.meta.url)),
  devtoolsPluginId,
)
if (offenders.length > 0) {
  console.error(`Devtools code in the production build:\n${offenders.join('\n')}`)
  process.exitCode = 1
}
