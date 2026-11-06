import * as v from 'valibot'

import { formatVersionSchema } from '../format-version'
import type { FormatVersion } from '../types'

export function aFormatVersion(version = 1): FormatVersion {
  return v.parse(formatVersionSchema, version)
}
