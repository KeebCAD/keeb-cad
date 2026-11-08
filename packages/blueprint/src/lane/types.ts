import type { Result } from '@keeb-cad/result'

import type { HandleTable } from './handle-table'

export type LaneFailed = { kind: 'lane-failed' } & (
  | { cause: 'threw'; message: string }
  | { cause: 'step-budget' }
  | { cause: 'out-of-memory' }
  | { cause: 'not-json-exact'; path: string }
  | { cause: 'pending-job' }
  | { cause: 'role'; output: string }
  | { cause: 'nested-input'; blueprint: string; input: string }
  | { cause: 'boundary'; message: string }
)

export type LaneFailure =
  LaneFailed | { kind: 'unavailable' } | { kind: 'blueprint-api-too-new'; blueprint: string }

export type LaneProblem = { message: string; severity: 'error' | 'warning'; blueprint?: string }

export interface LaneOutput {
  outputs: Record<string, unknown>
  problems: LaneProblem[]
}

/** The part of a declared lane the host checks; a `LaneDeclaration` is assignable to it. */
export interface LaneContract {
  outputs: readonly { name: string; count: 'one' | 'any' }[]
}

export interface LaneArgs {
  inputs: Record<string, unknown>
  pulls: Record<string, unknown>
  queries: Record<string, unknown>
}

/** Called once with the run's table, so a caller can pass pulls and refs as handles. */
export type BuildLaneArgs = (handles: HandleTable) => LaneArgs

export type Operation = (args: readonly unknown[], handles: HandleTable) => unknown
export type OperationTable = Readonly<Record<string, Operation>>

/** Converts one output value; a value it cannot convert is a failure the blueprint caused. */
export type ConvertHandle = (
  output: string,
  value: unknown,
  handles: HandleTable,
) => Result<unknown, string>

export interface StageCalls {
  operations: OperationTable
  convertHandle: ConvertHandle
}

export type NestedInputDeclaration = { default: unknown } & (
  | { kind: 'quantity' }
  | { kind: 'option'; options: readonly string[] }
  | { kind: 'boolean' | 'text' | 'part' | 'anchor' | 'asset' }
)

export interface NestedBlueprintDeclaration {
  id: string
  inputs: Readonly<Record<string, NestedInputDeclaration>>
}
