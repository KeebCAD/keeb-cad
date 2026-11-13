import { existsSync } from 'node:fs'

import { FIXTURE_DIR, readFixture } from './fixture-files'
import { keyPosesFrom } from './key-centres'
import type { KeyPose, Variant } from './key-centres'

/** Both variants share one `points`; they differ only in the PCB Ergogen emits. */
export const DESIGN_PCB: Record<Variant, string> = {
  wired: 'pcbs/corney_island.kicad_pcb',
  wireless: 'pcbs/corney_island_wireless.kicad_pcb',
}

/** The fixture's key poses for a variant. */
export function loadKeyPoses(variant: Variant): KeyPose[] {
  const pcb = new URL(DESIGN_PCB[variant], FIXTURE_DIR)
  if (!existsSync(pcb)) throw new Error(`Fixture for "${variant}" lacks ${DESIGN_PCB[variant]}`)
  return keyPosesFrom(readFixture('points/points.yaml'), readFixture('points/units.yaml'))
}
