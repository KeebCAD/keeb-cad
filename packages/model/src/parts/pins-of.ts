import {
  blueprintIdSchema,
  type BlueprintId,
  type LibraryId,
  type LibraryVersion,
  type Version,
} from '@keeb-cad/schema'
import * as v from 'valibot'

// A predicate, not v.is: v.is narrows only to the schema's input type, a plain string.
function isBlueprintId(id: LibraryId): id is BlueprintId {
  return v.safeParse(blueprintIdSchema, id).success
}

export function pinsOf(
  libraryVersions: readonly LibraryVersion[],
): { id: BlueprintId; version: Version }[] {
  return libraryVersions.flatMap(({ id, version }) => (isBlueprintId(id) ? [{ id, version }] : []))
}
