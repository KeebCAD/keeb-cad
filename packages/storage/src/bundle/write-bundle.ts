import { writeDesignFile, writeFingerprintsFile, writeRoutingFile } from '@keeb-cad/design-file'

import type { BundleTexts, DesignBundle } from './types'

export function writeBundle(bundle: DesignBundle): BundleTexts {
  return {
    design: writeDesignFile(bundle.design),
    routing: writeRoutingFile(bundle.routing),
    fingerprints: writeFingerprintsFile(bundle.fingerprints),
  }
}
