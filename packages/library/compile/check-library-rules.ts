import type { BlueprintDeclaration } from '@keeb-cad/schema'

import type { LibraryRuleEntry } from './types'

const label = ({ id, version }: BlueprintDeclaration) => `${id}@${String(version)}`

function rectangleProblems({ lanes, id }: BlueprintDeclaration): string[] {
  if (lanes.parts === undefined) return []
  const counts = lanes.parts.outputs
    .filter(({ role }) => role === 'rectangle')
    .map(({ count }) => count)
    .join(', ')
  return counts === 'one'
    ? []
    : [`${id}: a part blueprint declares exactly one rectangle of count one, found: ${counts}`]
}

const candidates = (library: readonly BlueprintDeclaration[], id: string, minVersion: number) =>
  library.filter((entry) => entry.id === id && entry.version >= minVersion)

function targetProblems(
  library: readonly BlueprintDeclaration[],
  declaration: BlueprintDeclaration,
): string[] {
  return declaration.uses.flatMap(({ id, minVersion }) => {
    const targets = candidates(library, id, minVersion)
    return targets.length === 0
      ? [`${declaration.id}: uses ${id}, which the library lacks`]
      : targets
          .filter(({ lanes }) =>
            Object.values(lanes).some(
              ({ pulls, queries }) => pulls.length > 0 || queries.length > 0,
            ),
          )
          .map((target) => `${declaration.id}: uses ${label(target)}, which has pulls or queries`)
  })
}

function cycleProblems(library: readonly BlueprintDeclaration[]): string[] {
  const problems = new Set<string>()
  const finished = new Set<BlueprintDeclaration>()
  const walk = (entry: BlueprintDeclaration, path: BlueprintDeclaration[]): void => {
    const seenAt = path.indexOf(entry)
    if (seenAt !== -1) {
      const loop = [...path.slice(seenAt), entry].map(({ id }) => id)
      problems.add(`a uses cycle: ${loop.join(' -> ')}`)
      return
    }
    if (finished.has(entry)) return
    for (const { id, minVersion } of entry.uses) {
      for (const target of candidates(library, id, minVersion)) walk(target, [...path, entry])
    }
    finished.add(entry)
  }
  for (const entry of library) walk(entry, [])
  return [...problems]
}

const visibleUseProblems = ({ declaration, visibleUses }: LibraryRuleEntry): string[] =>
  visibleUses
    .filter((id) => declaration.uses.every((used) => used.id !== id))
    .map((id) => `${declaration.id}: use() of ${id}, which is not in uses`)

function duplicateProblems(library: readonly BlueprintDeclaration[]): string[] {
  const labels = library.map((entry) => label(entry))
  return [...new Set(labels.filter((name, index) => labels.indexOf(name) !== index))].map(
    (name) => `${name}: declared by two sources`,
  )
}

export function checkLibraryRules(entries: readonly LibraryRuleEntry[]): string[] {
  const library = entries.map(({ declaration }) => declaration)
  return [
    ...duplicateProblems(library),
    ...library.flatMap((declaration) => rectangleProblems(declaration)),
    ...library.flatMap((declaration) => targetProblems(library, declaration)),
    ...cycleProblems(library),
    ...entries.flatMap((entry) => visibleUseProblems(entry)),
  ]
}
