// Loose on purpose: a missing `unit` or `options` must reach the library build's schema, which
// names the input, rather than stop at a type error that reports the shape of a union.
export interface DeclaredInputSource {
  kind: string
  label: string
  default?: unknown
  help?: string
  perSlot?: true
  unit?: string
  options?: readonly string[]
  range?: { min?: string; max?: string }
}

type InputValueOf<Input extends DeclaredInputSource> = Input['kind'] extends 'quantity'
  ? number
  : Input['kind'] extends 'boolean'
    ? boolean
    : Input['kind'] extends 'option' | 'text'
      ? string
      : unknown

export interface LaneArgsOf<Inputs extends Readonly<Record<string, DeclaredInputSource>>> {
  inputs: { [Name in keyof Inputs]: InputValueOf<Inputs[Name]> }
  pulls: Record<string, unknown>
  queries: Record<string, unknown>
}

export type LaneOperations = Readonly<Record<string, (...args: unknown[]) => unknown>>

export interface LaneResult {
  outputs: Record<string, unknown>
  problems: { message: string; severity: 'error' | 'warning' }[]
}

export interface LaneSource<Inputs extends Readonly<Record<string, DeclaredInputSource>>> {
  pulls: readonly { role: string; target?: string; count: string }[]
  queries: readonly string[]
  outputs: readonly {
    name: string
    role: string
    target?: string
    kind: string
    purpose?: unknown
    count: string
  }[]
  run: (args: LaneArgsOf<Inputs>, op: LaneOperations) => LaneResult
}

export interface BlueprintSource<
  Inputs extends Readonly<Record<string, DeclaredInputSource>> = Readonly<
    Record<string, DeclaredInputSource>
  >,
> {
  id: string
  version: number
  licence: { spdx: string; author: string; source?: string }
  inputs: Inputs
  uses: readonly { id: string; minVersion: number }[]
  lanes: Readonly<Partial<Record<string, LaneSource<Inputs>>>>
  upgrade?: unknown
  nets?: unknown
}

declare global {
  /** The sandbox's global for a nested blueprint; declared here because a source never imports it. */
  function use(id: string, inputs: Record<string, unknown>): LaneResult
}
