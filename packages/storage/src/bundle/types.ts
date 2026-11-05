import type { Design, FingerprintsFile, Frozen, RoutingFile } from '@keeb-cad/schema'

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
