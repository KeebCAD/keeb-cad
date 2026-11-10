export type TreeRow = { id: string; label: string; kind: 'group' | 'slot'; children: TreeRow[] }

export type TreeProps = { rows: readonly TreeRow[]; label: string }
