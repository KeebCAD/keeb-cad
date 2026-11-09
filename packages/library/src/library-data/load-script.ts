import { AsyncResult } from '@keeb-cad/result'
import type { BlueprintId, ScriptLoadFailed, Version } from '@keeb-cad/schema'

const PREFIX = 'lib:blueprint/'

const scripts = import.meta.glob<string>('../../compiled/**/*.js', {
  query: '?raw',
  import: 'default',
})

export function loadScript(
  id: BlueprintId,
  version: Version,
): AsyncResult<string, ScriptLoadFailed> {
  const load = scripts[`../../compiled/${id.slice(PREFIX.length)}/${String(version)}.js`]
  if (load === undefined) {
    return AsyncResult.err({
      kind: 'script-load-failed',
      message: `no script for ${id}@${String(version)}`,
    })
  }
  return AsyncResult.fromPromise(load(), (cause) => ({
    kind: 'script-load-failed',
    message: String(cause),
  }))
}
