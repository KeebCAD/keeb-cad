import * as v from 'valibot'

import type { Version } from '../types'
import { versionSchema } from '../version'

export function aVersion(value = 1): Version {
  return v.parse(versionSchema, value)
}
