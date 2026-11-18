import type { Design, Mutable, Parameter } from '@keeb-cad/schema'

export function addParameter(design: Mutable<Design>, parameter: Parameter): void {
  design.parameters.push({ ...parameter })
}
