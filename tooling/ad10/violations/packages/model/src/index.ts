// Allowed: model imports reactive and geometry.
import '../../reactive/src/index'
import '../../geometry/src/index'
// model-imports-only-reactive-and-geometry, through a type-only import.
import type { Part } from '../../library/src/index'
// fixtures-only-in-tests.
import '@keeb-cad/fixtures'
// only-register-imports-immer: outside the register concept.
import 'immer'

export type Model = Part[]
