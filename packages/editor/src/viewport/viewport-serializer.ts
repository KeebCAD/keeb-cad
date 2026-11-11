import type { Serializer } from '@vueuse/core'
import * as v from 'valibot'

import type { ViewportValue } from './types'
import { viewportValueSchema } from './viewport-value-schema'

// A stored value the schema refuses reads as none, so the design fits and the fit overwrites it.
export const viewportSerializer: Serializer<ViewportValue | null> = {
  read: (raw) => {
    try {
      const parsed = v.safeParse(viewportValueSchema, JSON.parse(raw))
      return parsed.success ? parsed.output : null
    } catch {
      return null
    }
  },
  write: (value) => JSON.stringify(value),
}
