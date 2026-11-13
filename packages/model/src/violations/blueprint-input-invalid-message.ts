import type { InputValue } from '@keeb-cad/schema'
import { match } from 'ts-pattern'

import type { BlueprintInputInvalid, CheckedInput } from '../inputs/types'

export function blueprintInputInvalidMessage(invalid: BlueprintInputInvalid): string {
  const { owner, input } = invalid
  const sets = `The ${owner.scope} "${owner.id}" sets "${input}"`
  const blueprint = owner.scope === 'slot' ? "its part's blueprint" : 'its blueprint'
  return match(invalid)
    .with({ reason: 'unknown' }, () => `${sets}, an input ${blueprint} doesn't declare.`)
    .with(
      { reason: 'not-per-slot' },
      () => `${sets}, which ${blueprint} doesn't let a slot change.`,
    )
    .with(
      { reason: 'bad-value' },
      ({ value, expected }) => `${sets} to ${printed(value)}, which ${allowed(expected)}.`,
    )
    .exhaustive()
}

function printed(value: InputValue): string {
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'boolean') return String(value)
  return value.value
}

function allowed(expected: CheckedInput): string {
  return match(expected)
    .with({ kind: 'option' }, ({ options }) => `isn't one of ${options.join(', ')}`)
    .with({ kind: 'boolean' }, () => "isn't true or false")
    .with({ kind: 'text' }, () => "isn't text")
    .exhaustive()
}
