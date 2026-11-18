import { useService } from '@keeb-cad/di/vue'

import { FieldSession } from './field-session'
import type { UseFieldSessionResult } from './types'

export function useFieldSession(): UseFieldSessionResult {
  const session = useService(FieldSession)
  return {
    begin: () => {
      session.begin()
    },
    end: () => {
      session.end()
    },
    key: () => session.key,
  }
}
