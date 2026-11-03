import { Result } from '@keeb-cad/result'
import type { Design, Frozen, Rejection } from '@keeb-cad/schema'

// Always ok until the first structural check (acyclicity) exists.
export const checkStructure: (design: Frozen<Design>) => Result<void, Rejection> = () => Result.ok()
