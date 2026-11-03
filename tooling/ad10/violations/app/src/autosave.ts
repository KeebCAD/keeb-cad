// Not an entry, so each worker subpath is fenced:
// only-model-worker-entry-imports-model-worker.
import '@keeb-cad/model/worker'
// only-model-worker-entry-and-pipeline-import-design-worker.
import '@keeb-cad/design/worker'
// only-worker-entries-import-library-worker.
import '@keeb-cad/library/worker'
// app-imports-model-worker-only: app reaches model only through model/worker.
import '@keeb-cad/model'
// app-imports-library-worker-only: app reaches library only through library/worker.
import '@keeb-cad/library'
