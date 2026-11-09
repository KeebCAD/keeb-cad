import { partIdSchema, type PartRef } from '@keeb-cad/schema'
import * as v from 'valibot'

import type { PartLookups, PartResolution } from './types'

export function resolvePartRef(
  ref: PartRef,
  { parts, libraryVersions, declarations }: PartLookups,
): PartResolution {
  if (v.safeParse(partIdSchema, ref).success) return { kind: 'unresolved', severity: 'error' }
  const part = parts.find(({ id }) => id === ref)
  if (part === undefined || part.type !== 'blueprint') {
    return { kind: 'unresolved', severity: 'warning' }
  }
  const pin = libraryVersions.find(({ id }) => id === part.blueprint)
  const declaration = pin === undefined ? undefined : declarations[part.blueprint]?.[pin.version]
  if (pin === undefined || declaration?.lanes.parts === undefined) {
    return { kind: 'unresolved', severity: 'error' }
  }
  return {
    kind: 'found',
    part,
    pin: { id: part.blueprint, version: pin.version },
    declaration,
  }
}
