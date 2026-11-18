import type { Frozen, Parameter } from '@keeb-cad/schema'
import type { AutocompleteOption } from '@keeb-cad/ui'

import type { ParameterValue } from './types'
import { valueText } from './value-text'

// Each parameter whose name starts with the typed name, in the design's order, with its value; one
// that failed, or overflowed past what a number shows, has no value to show, so it shows its name
// alone. A later parameter with a taken name is the same name, so it is offered once.
export function parameterOptions(
  parameters: Frozen<Parameter[]>,
  values: ReadonlyMap<string, ParameterValue>,
  typed: string | undefined,
): AutocompleteOption[] {
  if (typed === undefined) return []
  const names = new Set<string>()
  return parameters.flatMap(({ name }) => {
    if (!name.startsWith(typed) || names.has(name)) return []
    names.add(name)
    const value = values.get(name)
    const label =
      value === undefined || !Number.isFinite(value.value)
        ? name
        : `${name} ${valueText(value.value, value.unit)}`
    return [{ value: name, label }]
  })
}
