import { InvariantError } from '@keeb-cad/result'
import type { Frozen, Offset } from '@keeb-cad/schema'

import { valueKey } from '../evaluation/value-key'
import type { GraphEntry } from '../dependencies/types'
import type { ReadOffset } from './types'

// A node's offset in numbers; an absent field reads as 0.
export function readOffset(
  { node, path }: Pick<GraphEntry, 'node' | 'path'>,
  values: ReadonlyMap<string, number>,
): ReadOffset {
  const offset: Frozen<Offset> | undefined = node.offset
  const read = (present: unknown, ...field: string[]) => {
    if (present === undefined) return 0
    const value = values.get(valueKey([...path, 'offset', ...field]))
    // A node whose field failed is unplaced, so placement never reads it.
    if (value === undefined) {
      throw new InvariantError(`The ${field.join(' ')} of "${node.id}" has no value to place by.`)
    }
    return value
  }
  return {
    position: {
      x: read(offset?.position?.x, 'position', 'x'),
      y: read(offset?.position?.y, 'position', 'y'),
    },
    rotation: read(offset?.rotation, 'rotation'),
    pivot: { x: read(offset?.pivot?.x, 'pivot', 'x'), y: read(offset?.pivot?.y, 'pivot', 'y') },
  }
}
