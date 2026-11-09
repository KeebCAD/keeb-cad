import { Option } from '@keeb-cad/result'
import type { BlueprintDeclaration, BlueprintId, LibraryData, Version } from '@keeb-cad/schema'

import { keyOf } from '../pool/pin-key'
import type { BlueprintPin, ResolvedPin } from './types'

/** `pin`'s declaration and what it reaches through `uses`, at pinned versions; none if one is unknown. */
export function resolveClosure(
  declarations: LibraryData['declarations'],
  pin: BlueprintPin,
  pinnedVersions: ReadonlyMap<BlueprintId, Version>,
): Option<ResolvedPin> {
  const root = declarations[pin.id]?.[pin.version]
  if (root === undefined) return Option.none()

  const reached = new Map<string, BlueprintDeclaration>()
  const pending = [...root.uses]
  for (let used = pending.pop(); used !== undefined; used = pending.pop()) {
    const version = pinnedVersions.get(used.id)
    const declaration = version === undefined ? undefined : declarations[used.id]?.[version]
    if (declaration === undefined) return Option.none()
    const key = keyOf(declaration.id, declaration.version)
    if (reached.has(key)) continue
    reached.set(key, declaration)
    pending.push(...declaration.uses)
  }
  return Option.some({ root, closure: [...reached.values()] })
}
