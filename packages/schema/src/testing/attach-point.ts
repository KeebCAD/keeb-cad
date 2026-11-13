import * as v from 'valibot'

import { attachPointSchema } from '../attach-point'
import type { AttachPoint } from '../types'

export function anAttachPoint(name = 'center'): AttachPoint {
  return v.parse(attachPointSchema, name)
}
