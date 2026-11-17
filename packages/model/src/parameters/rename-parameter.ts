import type { Design, Mutable, ParameterName } from '@keeb-cad/schema'

import { valueAt } from '../references/value-at'
import { renamedExpressions } from './renamed-expressions'

// Renames the first parameter with the name, which is the one expressions read, and every use of
// the name in the same edit.
export function renameParameter(
  design: Mutable<Design>,
  from: ParameterName,
  to: ParameterName,
): void {
  if (from === to) return
  for (const { path, text } of renamedExpressions(design, from, to)) {
    const holder = valueAt(design, path.slice(0, -1)) as Record<string | number, unknown>
    holder[path.at(-1) as string | number] = text
  }
  const parameter = design.parameters.find(({ name }) => name === from)
  if (parameter !== undefined) parameter.name = to
}
