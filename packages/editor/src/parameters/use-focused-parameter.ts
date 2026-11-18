import { useService } from '@keeb-cad/di/vue'

import { FocusedParameter } from './focused-parameter'
import type { UseFocusedParameterResult } from './types'

export function useFocusedParameter(): UseFocusedParameterResult {
  const focused = useService(FocusedParameter)
  return {
    focus: (name) => {
      focused.focus(name)
    },
    clear: () => {
      focused.clear()
    },
  }
}
