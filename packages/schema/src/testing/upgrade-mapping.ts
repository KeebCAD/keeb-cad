import type { UpgradeMapping } from '../types'
import { aVersion } from './version'

export function anUpgradeMapping(overrides: Partial<UpgradeMapping> = {}): UpgradeMapping {
  return { from: aVersion(), ...overrides }
}
