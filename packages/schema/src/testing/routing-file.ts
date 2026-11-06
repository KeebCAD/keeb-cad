import type { RoutingFile } from '../types'
import { aRevision } from './revision'

export function aRoutingFile({ revision = aRevision() }: Partial<RoutingFile> = {}): RoutingFile {
  return { revision }
}
