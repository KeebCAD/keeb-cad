import type { Value } from '@keeb-cad/expr'
import type { Frozen, Gap, Group, Id, ItemId, Parameter, ParameterName } from '@keeb-cad/schema'

export type ExpressionFaultKind =
  'unit-mismatch' | 'unresolvable-reference' | 'division-by-zero' | 'negative-length'

// Why one expression has no value; `name` is the missing parameter of unresolvable-reference.
export interface ExpressionFault {
  kind: ExpressionFaultKind
  name?: string
}

// An expression that reads a failed parameter has no value and no fault of its own: that
// parameter reports it. Not an ExpressionFaultKind, so it never reaches a Violation.
export interface ReadsFailedParameter {
  kind: 'reads-failed-parameter'
}

// `path` runs from the item: ['gap', 'x'] on meta, ['value'] on a parameter, ['offset', …] on a
// node.
export interface FieldViolation extends ExpressionFault {
  item: ItemId
  path: (string | number)[]
}

export interface ExpressionSections {
  designId: Id
  parameters: Frozen<Parameter[]>
  gap: Frozen<Gap>
  layout: Frozen<Group>
}

export interface ExpressionEvaluation {
  // Each quantity field of meta and the layout that evaluated, by its path from the design root
  // joined with '/'.
  values: ReadonlyMap<string, number>
  // Meta, then parameters in list order, then nodes in tree order.
  fieldViolations: FieldViolation[]
  // Each in loop order from its lowest member by compareCodeUnits; sorted by that member.
  cycles: ParameterName[][]
  failedGap: { x: boolean; y: boolean }
  // Nodes with a quantity field that failed or reads a failed parameter.
  unplacedNodes: ReadonlySet<Id>
}

export interface ParameterEvaluation {
  // Each parameter that evaluated, by name.
  scope: ReadonlyMap<string, Value>
  // Each parameter in a loop, that failed, or that reads one that did.
  failed: ReadonlySet<string>
  cycles: ParameterName[][]
  // In list order.
  violations: FieldViolation[]
}

// Why text typed into a field has no value: it does not parse, it fails as an applied expression
// would, or it reads a parameter that failed.
export type ExpressionError =
  { kind: 'expression-syntax-error' } | ExpressionFault | ReadsFailedParameter

// `literal` is a plain literal: one number with its unit, which already reads as its value.
export interface EvaluatedValue extends Value {
  literal: boolean
}
