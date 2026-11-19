import type { PartsRow } from '@keeb-cad/protocol'

import { loopPath } from '../../viewport/loop-path'

export function slotSpacePath(slotSpace: PartsRow): string {
  return slotSpace
    .flatMap(({ outer, holes }) => [outer, ...holes])
    .map(loopPath)
    .join(' ')
}
