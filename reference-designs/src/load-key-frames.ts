import { existsSync } from 'node:fs'

import { FIXTURE_DIR, readFixture } from './fixture-files'
import { keyFramesFrom } from './key-centres'
import type { KeyFrame, Variant } from './key-centres'

/** Both variants share one `points`; they differ only in the PCB Ergogen emits. */
export const DESIGN_PCB: Record<Variant, string> = {
  wired: 'pcbs/corney_island.kicad_pcb',
  wireless: 'pcbs/corney_island_wireless.kicad_pcb',
}

/** The fixture's key frames for a variant. */
export function loadKeyFrames(variant: Variant): KeyFrame[] {
  const pcb = new URL(DESIGN_PCB[variant], FIXTURE_DIR)
  if (!existsSync(pcb)) throw new Error(`Fixture for "${variant}" lacks ${DESIGN_PCB[variant]}`)
  return keyFramesFrom(readFixture('points/points.yaml'), readFixture('points/units.yaml'))
}
