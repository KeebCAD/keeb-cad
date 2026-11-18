import { InvariantError, Result } from '@keeb-cad/result'
import {
  angleSchema,
  deltaSchema,
  type Design,
  type Frozen,
  type Id,
  type Rejection,
} from '@keeb-cad/schema'
import type * as v from 'valibot'

import { evaluateFieldExpression } from '../evaluation/evaluate-field-expression'
import { reject } from '../reject/reject'
import { expressionFaultMessage } from '../violations/expression-fault-message'
import { unknownNodeMessage } from '../violations/unknown-node-message'
import { findNode } from './node-tree'
import type { OffsetEdit } from './types'

// Every missing node first, then each given expression in the order the offset declares its
// fields, refusing the first that fails for every node it would be written to. One that reads a
// failed parameter passes, since that parameter reports its own fault.
export function checkSetOffset(
  design: Frozen<Design>,
  ids: readonly Id[],
  edit: Frozen<OffsetEdit>,
): Result<void, Rejection> {
  const nodes = [...new Set(ids)]
  const missing = nodes.filter((id) => findNode(design.layout, id) === undefined)
  if (missing.length > 0) {
    return Result.err(reject('unknown-target', missing, unknownNodeMessage(missing)))
  }
  for (const [field, expression, schema] of givenExpressions(edit)) {
    const evaluated = evaluateFieldExpression(design.parameters, expression, schema)
    if (evaluated.isOk()) continue
    const failure = evaluated.error
    if (failure.kind === 'reads-failed-parameter') continue
    if (failure.kind === 'expression-syntax-error') {
      throw new InvariantError(
        `The offset's ${field} "${expression}" passed its schema but does not parse.`,
      )
    }
    return Result.err(reject(failure.kind, nodes, expressionFaultMessage(failure, nodes)))
  }
  return Result.ok()
}

function givenExpressions(
  edit: Frozen<OffsetEdit>,
): [field: string, expression: string, schema: v.GenericSchema][] {
  const fields: [string, string | null | undefined, v.GenericSchema][] = [
    ['position x', edit.position?.x, deltaSchema],
    ['position y', edit.position?.y, deltaSchema],
    ['rotation', edit.rotation, angleSchema],
    ['pivot x', edit.pivot?.x, deltaSchema],
    ['pivot y', edit.pivot?.y, deltaSchema],
  ]
  return fields.filter(
    (field): field is [string, string, v.GenericSchema] => typeof field[1] === 'string',
  )
}
