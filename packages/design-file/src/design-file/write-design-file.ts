import { format, Node } from '@bgotink/kdl'
import { type Design, designSchema, type Frozen } from '@keeb-cad/schema'

import { writeKdl } from '../codec/write-kdl'
import { currentFormatVersion } from '../current-format-version'

export function writeDesignFile(design: Frozen<Design>): string {
  const version = Node.create('format-version')
  version.addArgument(currentFormatVersion)
  return format(version) + writeKdl(designSchema, design)
}
