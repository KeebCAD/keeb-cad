import type {
  Design,
  FingerprintsFile,
  Frozen,
  MigratedBundle,
  RoutingFile,
} from '@keeb-cad/schema'

import type { DesignLabel } from '../design-storage/types'

// The design bundle as the design store holds it.
export interface DesignBundle {
  design: Frozen<Design>
  routing: Frozen<RoutingFile>
  fingerprints: Frozen<FingerprintsFile>
}

// Each file of the bundle as KDL text.
export interface BundleTexts {
  design: string
  routing: string
  fingerprints: string
}

// What load hands back: the migrated bundle, its text as read, which a reset point saves
// unchanged, and the loaded version's label.
export interface LoadedBundle {
  migrated: MigratedBundle
  asRead: BundleTexts
  label: DesignLabel
}
