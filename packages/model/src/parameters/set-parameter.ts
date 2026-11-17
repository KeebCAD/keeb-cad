import type { Design, Mutable, Parameter } from '@keeb-cad/schema'

// A name the design has keeps its place in the list with the new value; a new name is appended.
export function setParameter(design: Mutable<Design>, parameter: Parameter): void {
  const existing = design.parameters.find(({ name }) => name === parameter.name)
  if (existing === undefined) {
    design.parameters.push({ ...parameter })
  } else {
    existing.value = parameter.value
  }
}
