// Allowed: the model worker's entry imports model/worker, design/worker and library/worker.
import '@keeb-cad/model/worker'
import '@keeb-cad/design/worker'
import '@keeb-cad/library/worker'
// worker-entries-reach-no-ui: the editor, and through it ui, di/vue and vue, via ./wiring.
import './wiring'
