import type { Value } from '@keeb-cad/expr'
import { InvariantError } from '@keeb-cad/result'
import {
  type Frozen,
  gapSchema,
  groupSchema,
  type Id,
  type ItemId,
  type Parameter,
  type ParameterName,
} from '@keeb-cad/schema'
import { match } from 'ts-pattern'
import type * as v from 'valibot'

import { cyclesOf } from '../dependencies/cycles-of'
import { dependencyGraph } from '../dependencies/dependency-graph'
import { parameterDependencies } from '../dependencies/parameter-dependencies'
import type { SchemaValue } from '../references/types'
import { walkSchema } from '../references/walk-schema'
import { evaluateField } from './evaluate-field'
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
  const nodeAt = new Map(
    [...dependencyGraph(layout)].map(([id, { path }]) => [valueKey(path), id] as const),
  )
  const nodeViolations = evaluateFields(
    walkSchema(groupSchema, layout, ['layout']),
    (path) => {
      for (let at = path.length - 1; at > 0; at -= 1) {
        const id = nodeAt.get(valueKey(path.slice(0, at)))
        if (id !== undefined) return { item: id, at }
      }
      throw new InvariantError(`The field at ${valueKey(path)} is in no node.`)
    },
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

function evaluateParameters(parameters: Frozen<Parameter[]>) {
  const dependencies = parameterDependencies(parameters)
  const cycles = cyclesOf(dependencies)
  const failed = new Set<string>(cycles.flat())
  const scope = new Map<string, Value>()
  const first = new Map<ParameterName, number>()
  for (const [index, { name }] of parameters.entries()) if (!first.has(name)) first.set(name, index)
  const violations = new Map<number, FieldViolation>()
  // Loops are failed before any parameter is settled, so what is left to settle is acyclic.
  const settle = (name: ParameterName) => {
    const index = first.get(name)
    if (index === undefined || scope.has(name) || failed.has(name)) return
    for (const read of dependencies.get(name) ?? []) settle(read)
    const { value } = parameters[index] as Frozen<Parameter>
    evaluateField(value, {}, scope, failed).match<void>({
      ok: (evaluated) => {
        scope.set(name, evaluated)
      },
      err: (failure) => {
        failed.add(name)
        match(failure)
          .with({ kind: 'reads-failed-parameter' }, () => {})
          .otherwise((fault) => violations.set(index, { ...fault, item: name, path: ['value'] }))
      },
    })
  }
  for (const name of first.keys()) settle(name)
  return {
    scope,
    failed,
    cycles,
    violations: [...violations].toSorted(([a], [b]) => a - b).map(([, violation]) => violation),
  }
}
