import { migrateBundle } from '@keeb-cad/design-file'
import type { Result } from '@keeb-cad/result'
import type { LoadError, MigratedBundle } from '@keeb-cad/schema'

import type { BundleTexts } from './types'

// A file storage does not have is absent.
export function readBundle(texts: Partial<BundleTexts>): Result<MigratedBundle, LoadError> {
  return migrateBundle({
    design: texts.design,
    routing: texts.routing,
    fingerprints: texts.fingerprints,
  })
}
