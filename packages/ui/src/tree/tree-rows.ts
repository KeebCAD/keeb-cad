import type { TreeRow } from './types'

export function groupIdsOf(rows: readonly TreeRow[]): string[] {
  return rows.flatMap((row) => (row.kind === 'group' ? [row.id, ...groupIdsOf(row.children)] : []))
}

export function findTreeRow(rows: readonly TreeRow[], id: string | undefined): TreeRow | undefined {
  if (id === undefined) return undefined
  for (const row of rows) {
    if (row.id === id) return row
    const found = findTreeRow(row.children, id)
    if (found !== undefined) return found
  }
  return undefined
}
