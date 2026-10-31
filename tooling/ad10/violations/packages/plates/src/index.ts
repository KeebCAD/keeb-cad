// Allowed: plates imports model, geometry and reactive.
import '../../model/src/index'
import '../../geometry/src/index'
import '../../reactive/src/index'
// plates-and-pcb-import-only-model-geometry-reactive, by relative path and by bare specifier.
import '../../pcb/src/index'
import '@keeb-cad/pcb'
// nothing-imports-editor, by bare specifier.
import '@keeb-cad/editor'
// only-geometry-imports-makerjs.
import 'makerjs'
