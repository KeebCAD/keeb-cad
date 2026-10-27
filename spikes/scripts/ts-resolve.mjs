// Lets Node run spikes/src as is: its imports are extensionless (Vite/bundler style), so a
// relative specifier that does not resolve is retried with `.ts`. Node strips the types itself.
// A Vite `?raw` import (src/corney.ts) loads as a module whose default export is the file's text.
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (!/^\.{1,2}\//.test(specifier) || /\.[cm]?[jt]s$/.test(specifier)) throw error
      return nextResolve(`${specifier}.ts`, context)
    }
  },
  load(url, context, nextLoad) {
    const u = new URL(url)
    if (u.protocol !== 'file:' || u.search !== '?raw') return nextLoad(url, context)
    u.search = ''
    const text = readFileSync(fileURLToPath(u), 'utf8')
    return { format: 'module', source: `export default ${JSON.stringify(text)}`, shortCircuit: true }
  },
})
