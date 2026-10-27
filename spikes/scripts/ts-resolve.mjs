// Lets Node run spikes/src as is: its imports are extensionless (Vite/bundler style), so a
// relative specifier that does not resolve is retried with `.ts`. Node strips the types itself.
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (!/^\.{1,2}\//.test(specifier) || /\.[cm]?[jt]s$/.test(specifier)) throw error
      return nextResolve(`${specifier}.ts`, context)
    }
  },
})
