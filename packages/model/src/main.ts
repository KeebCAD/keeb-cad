import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

// model/main: domain operations and queries, imported by design, commands and editor (AD-10).

/** One structural check over a produced design: a rejection, or `undefined` when it holds. */
type StructuralCheck = (design: Frozen<Design>) => Rejection | undefined

/** The structural checks the register runs after every produced value. 13.3 adds the cycle. */
const STRUCTURAL_CHECKS: readonly StructuralCheck[] = []

/** Runs the structural checks in order and returns the first rejection, if any (AD-2). */
export function checkStructure(design: Frozen<Design>): Rejection | undefined {
  for (const check of STRUCTURAL_CHECKS) {
    const rejection = check(design)
    if (rejection) return rejection
  }
  return undefined
}
