import type { Design, Mutable, ParameterName } from '@keeb-cad/schema'

export function deleteParameter(design: Mutable<Design>, name: ParameterName): void {
  const index = design.parameters.findIndex((parameter) => parameter.name === name)
  if (index !== -1) design.parameters.splice(index, 1)
}
