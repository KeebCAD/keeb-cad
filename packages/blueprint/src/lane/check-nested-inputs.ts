import { parseExpression } from '@keeb-cad/expr'
import { Option, Result } from '@keeb-cad/result'
import { match } from 'ts-pattern'
import * as v from 'valibot'

import type { LaneFailed, NestedBlueprintDeclaration, NestedInputDeclaration } from './types'

const handleSchema = v.pipe(v.number(), v.integer())

const inputSchema = (declared: NestedInputDeclaration) =>
  match(declared)
    .with({ kind: 'quantity' }, () => v.pipe(v.number(), v.finite()))
    .with({ kind: 'option' }, ({ options }) => v.picklist(options))
    .with({ kind: 'boolean' }, () => v.boolean())
    .with({ kind: 'text' }, () => v.string())
    .with({ kind: 'part' }, { kind: 'anchor' }, { kind: 'asset' }, () => handleSchema)
    .exhaustive()

// A part, anchor or asset default is tagged data; a lane receives those only as handles.
const defaultValue = (declared: NestedInputDeclaration): Option<unknown> =>
  match(declared)
    .with({ kind: 'quantity' }, ({ default: value }) =>
      parseExpression((value as { value: string }).value).match<Option<unknown>>({
        ok: (parsed) => Option.some(parsed.value),
        err: () => Option.none(),
      }),
    )
    .with({ kind: 'part' }, { kind: 'anchor' }, { kind: 'asset' }, () => Option.none<unknown>())
    .otherwise(({ default: value }) => Option.some(value))

export function checkNestedInputs(
  blueprint: NestedBlueprintDeclaration,
  given: unknown,
): Result<Record<string, unknown>, LaneFailed> {
  const nestedInputFailure = (input: string): LaneFailed => ({
    kind: 'lane-failed',
    cause: 'nested-input',
    blueprint: blueprint.id,
    input,
  })

  if (typeof given !== 'object' || given === null || Array.isArray(given)) {
    return Result.err(nestedInputFailure('(inputs)'))
  }
  const values = given as Record<string, unknown>

  for (const name of Object.keys(values)) {
    if (!Object.hasOwn(blueprint.inputs, name)) return Result.err(nestedInputFailure(name))
  }

  const resolved: Record<string, unknown> = {}
  for (const [name, declared] of Object.entries(blueprint.inputs)) {
    if (!Object.hasOwn(values, name)) {
      const fallback = defaultValue(declared)
      if (!fallback.isSome()) return Result.err(nestedInputFailure(name))
      resolved[name] = fallback.value
      continue
    }
    const value = values[name]
    if (!v.safeParse(inputSchema(declared), value).success) {
      return Result.err(nestedInputFailure(name))
    }
    resolved[name] = value
  }
  return Result.ok(resolved)
}
