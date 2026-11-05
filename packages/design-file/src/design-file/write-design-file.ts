import { type Design, designSchema, type Frozen } from '@keeb-cad/schema'

import { writeKdl } from '../codec/write-kdl'
import { currentFormatVersion } from '../current-format-version'

export function writeDesignFile(design: Frozen<Design>): string {
  return `format-version ${currentFormatVersion}\n${writeKdl(designSchema, design)}`
}
