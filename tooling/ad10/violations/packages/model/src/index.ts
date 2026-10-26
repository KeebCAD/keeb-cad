// model-imports-no-workspace-package, through a type-only import.
import type { Part } from '../../library/src/index'
// fixtures-only-in-tests.
import '@keeb-cad/fixtures'

export type Model = Part[]
