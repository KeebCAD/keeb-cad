import { InvariantError } from '@keeb-cad/result'
import { gapSchema, groupSchema, type Id, type ItemId } from '@keeb-cad/schema'
import { match } from 'ts-pattern'
import type * as v from 'valibot'

import { nodeAtPath, nodePaths } from '../ids/node-at-path'
import type { SchemaValue } from '../references/types'
import { walkSchema } from '../references/walk-schema'
import { evaluateField } from './evaluate-field'
import { evaluateParameters } from './evaluate-parameters'
import type { ExpressionEvaluation, ExpressionSections, FieldViolation } from './types'
import { valueKey } from './value-key'

// Parameters in dependency order, then every quantity field of meta and the layout against them.
// A parameter in a loop, one that fails, and a later one with a taken name stay out of the scope.
export function evaluateExpressions({
  designId,
  parameters,
  gap,
  layout,
}: ExpressionSections): ExpressionEvaluation {
  const { scope, failed, cycles, violations: parameterViolations } = evaluateParameters(parameters)
  const values = new Map<string, number>()
  const failedGap = { x: false, y: false }
  const unplacedNodes = new Set<Id>()
  const evaluateFields = (
    fields: Iterable<SchemaValue>,
    ownerOf: (path: SchemaValue['path']) => { item: ItemId; at: number },
    onFailed: (item: ItemId, path: SchemaValue['path']) => void,
  ): FieldViolation[] => {
    const violations: FieldViolation[] = []
    for (const { path, metadata, value } of fields) {
      if (metadata.unit === undefined) continue
      evaluateField(value as string, metadata, scope, failed).match<void>({
        ok: ({ value: number }) => {
          values.set(valueKey(path), number)
        },
        err: (failure) => {
          const { item, at } = ownerOf(path)
          onFailed(item, path)
          match(failure)
            .with({ kind: 'reads-failed-parameter' }, () => {})
            .otherwise((fault) => violations.push({ ...fault, item, path: path.slice(at) }))
        },
      })
    }
    return violations
  }

  const metaViolations = evaluateFields(
    walkSchema(gapSchema as v.GenericSchema, gap, ['meta', 'gap']),
    () => ({ item: designId, at: 1 }),
    (_item, path) => {
      failedGap[path[2] as 'x' | 'y'] = true
    },
  )
  const paths = nodePaths(layout)
  const nodeViolations = evaluateFields(
    walkSchema(groupSchema, layout, ['layout']),
    (path) =>
      nodeAtPath(paths, path).match({
        some: ({ id, at }) => ({ item: id, at }),
        none: () => {
          throw new InvariantError(`The field at ${valueKey(path)} is in no node.`)
        },
      }),
    (item) => unplacedNodes.add(item as Id),
  )
  return {
    values,
    fieldViolations: [...metaViolations, ...parameterViolations, ...nodeViolations],
    cycles,
    failedGap,
    unplacedNodes,
  }
}
