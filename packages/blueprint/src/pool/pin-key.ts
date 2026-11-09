import type { PinnedBlueprint } from './types'

export const keyOf = (id: string, version: number) => `${id}@${String(version)}`

export const closureKeyOf = ({ closure }: Pick<PinnedBlueprint, 'closure'>) =>
  closure
    .map(({ declaration }) => keyOf(declaration.id, declaration.version))
    .toSorted((a, b) => a.localeCompare(b))
    .join(',')
