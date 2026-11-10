import { InvariantError } from '@keeb-cad/result'
import { type Id, idSchema } from '@keeb-cad/schema'
import * as v from 'valibot'

import type { PlacementSide } from './types'

export function sideQualifiedId(side: PlacementSide, id: string): string {
  return `${side}/${id}`
}

// Every posted row id is side-qualified, so one without a side or a node id is a bug.
export function nodeIdOf(qualified: string): Id {
  const separator = qualified.indexOf('/')
  const side = qualified.slice(0, Math.max(separator, 0))
  const node = v.safeParse(idSchema, qualified.slice(separator + 1))
  if (separator === -1 || side === '' || !node.success) {
    throw new InvariantError(`"${qualified}" is not a side-qualified node id.`)
  }
  return node.output
}
