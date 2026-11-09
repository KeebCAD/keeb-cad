import { fileURLToPath } from 'node:url'

import { compileLibrary } from './compile-library'

await compileLibrary({
  sourcesDir: fileURLToPath(new URL('../blueprints-src', import.meta.url)),
  outDir: fileURLToPath(new URL('../compiled', import.meta.url)),
})
