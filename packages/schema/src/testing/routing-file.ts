import * as v from 'valibot'

import { revisionSchema } from '../revision'
import type { RoutingFile } from '../types'

export function aRoutingFile({
  revision = v.parse(revisionSchema, 'r1'),
}: Partial<RoutingFile> = {}): RoutingFile {
  return { revision }
}
