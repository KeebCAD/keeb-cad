import type { Value } from '@keeb-cad/expr'
import type { Frozen, Parameter, ParameterName } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

import { cyclesOf } from '../dependencies/cycles-of'
import { parameterDependencies } from '../dependencies/parameter-dependencies'
import { evaluateField } from './evaluate-field'
import type { FieldViolation, ParameterEvaluation } from './types'

// A parameter in a loop, one that fails, and a later one with a taken name stay out of the scope.
export function evaluateParameters(parameters: Frozen<Parameter[]>): ParameterEvaluation {
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
