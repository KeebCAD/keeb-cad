import type { ItemId, Violation } from '@keeb-cad/schema'

import type { ExpressionEvaluation, ExpressionFault } from '../evaluation/types'
import { dependencyCycleMessage } from './dependency-cycle-message'
import { expressionFaultMessage } from './expression-fault-message'

// Parameter loops, then one violation per kind and item in design order: an item's second failing
// field would read alike. A missing name is one violation naming every item that uses it.
export function expressionViolations({
  fieldViolations,
  cycles,
}: Pick<ExpressionEvaluation, 'fieldViolations' | 'cycles'>): Violation[] {
  const grouped = new Map<string, { fault: ExpressionFault; ids: ItemId[] }>()
  for (const { kind, name, item, path } of fieldViolations) {
    // The path's first segment keeps meta, a parameter and a node that share one id apart.
    const key = kind === 'unresolvable-reference' ? `${kind} ${name}` : `${kind} ${path[0]} ${item}`
    const group = grouped.get(key)
    if (group === undefined) grouped.set(key, { fault: { kind, name }, ids: [item] })
    else if (!group.ids.includes(item)) group.ids.push(item)
  }
  return [
    ...cycles.map((ids): Violation => ({
      kind: 'dependency-cycle',
      severity: 'error',
      ids,
      message: dependencyCycleMessage(ids, 'parameters'),
      fixes: [],
    })),
    ...[...grouped.values()].map(({ fault, ids }): Violation => ({
      kind: fault.kind,
      severity: 'error',
      ids,
      message: expressionFaultMessage(fault, ids),
      fixes: [],
    })),
  ]
}
