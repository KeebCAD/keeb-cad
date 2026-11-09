import { AsyncResult } from '@keeb-cad/result'
import type { BlueprintDeclaration, BlueprintId, LibraryData, Version } from '@keeb-cad/schema'
import { aBlueprintDeclaration } from '@keeb-cad/schema/testing'

import { keyOf } from '../pool/pin-key'
import type { LibraryBlueprint } from './types'

/** A fake library: each blueprint's script loads, and a blueprint with no script fails to load. */
export function aLibraryData(
  blueprints: readonly LibraryBlueprint[] = [{ declaration: aBlueprintDeclaration() }],
): LibraryData {
  const declarations: Record<BlueprintId, Record<Version, BlueprintDeclaration>> = {}
  const scripts = new Map<string, string>()
  for (const { declaration, script } of blueprints) {
    declarations[declaration.id] = {
      ...declarations[declaration.id],
      [declaration.version]: declaration,
    }
    if (script !== undefined) scripts.set(keyOf(declaration.id, declaration.version), script)
  }
  return {
    declarations,
    loadScript: (id, version) => {
      const script = scripts.get(keyOf(id, version))
      return script === undefined
        ? AsyncResult.err({ kind: 'script-load-failed', message: `no script for ${id}` })
        : AsyncResult.ok(script)
    },
  }
}
