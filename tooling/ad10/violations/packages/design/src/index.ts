// Allowed: design imports model/main, library's root and immer.
import '@keeb-cad/model/main'
import '@keeb-cad/library'
import 'immer'
// commands-design-pipeline-import-library-root-only: design reads declarations only.
import '@keeb-cad/library/worker'
// only-tests-import-testing: a resolved import of the testing folder.
import './testing/bundle'
