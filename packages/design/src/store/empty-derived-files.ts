import type { Revision } from '@keeb-cad/schema'

import type { DerivedFiles } from './types'

export function emptyDerivedFiles(revision: Revision): DerivedFiles {
  return {
    routing: { revision },
    fingerprints: { revision, fingerprints: [] },
  }
}
