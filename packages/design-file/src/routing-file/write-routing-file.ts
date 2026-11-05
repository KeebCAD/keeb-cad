import { type Frozen, type RoutingFile, routingFileSchema } from '@keeb-cad/schema'

import { writeKdl } from '../codec/write-kdl'

export function writeRoutingFile(routing: Frozen<RoutingFile>): string {
  return writeKdl(routingFileSchema, routing)
}
