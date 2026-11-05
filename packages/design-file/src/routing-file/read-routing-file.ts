import type { Result } from '@keeb-cad/result'
import { routingFileSchema } from '@keeb-cad/schema'

import { parseKdl } from '../codec/parse-kdl'
import { readKdl } from '../codec/read-kdl'

export function readRoutingFile(text: string): Result<unknown, string> {
  return parseKdl(text).flatMap((document) => readKdl(routingFileSchema, document.nodes))
}
