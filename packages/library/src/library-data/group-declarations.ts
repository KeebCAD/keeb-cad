import type { BlueprintDeclaration, LibraryData } from '@keeb-cad/schema'

export function groupDeclarations(
  all: readonly BlueprintDeclaration[],
): LibraryData['declarations'] {
  const grouped: Record<string, Record<number, BlueprintDeclaration>> = {}
  for (const declaration of all) {
    grouped[declaration.id] = { ...grouped[declaration.id], [declaration.version]: declaration }
  }
  return grouped
}
