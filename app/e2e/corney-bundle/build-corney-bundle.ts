import { fileURLToPath } from 'node:url'
import { createServer, createServerModuleRunner } from 'vite'

import type { CorneyBundle } from './types'

const BUILDER = fileURLToPath(new URL('bundle-corney.ts', import.meta.url))

// Corney's script reaches the blueprint library, whose import.meta.glob only Vite can load.
export async function buildCorneyBundle(cacheDir: string): Promise<CorneyBundle> {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../..', import.meta.url)),
    cacheDir,
    logLevel: 'warn',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  })
  const runner = createServerModuleRunner(server.environments.ssr, { hmr: false })
  try {
    const { bundleCorney } = (await runner.import(BUILDER)) as typeof import('./bundle-corney')
    return await bundleCorney()
  } finally {
    await runner.close()
    await server.close()
  }
}
