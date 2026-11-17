import { designSchema, type Design, type Frozen } from '@keeb-cad/schema'

import { walkSchema } from '../references/walk-schema'
import { renameInExpression } from './rename-in-expression'
import type { RenamedExpression } from './types'

export function renamedExpressions(
  design: Frozen<Design>,
  from: string,
  to: string,
): RenamedExpression[] {
  return [...walkSchema(designSchema, design)].flatMap(({ path, metadata, value }) => {
    if (metadata.expression !== true) return []
    const text = renameInExpression(value as string, from, to)
    return text === value ? [] : [{ path, text }]
  })
}
