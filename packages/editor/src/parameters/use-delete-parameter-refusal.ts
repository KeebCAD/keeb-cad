import { useService } from '@keeb-cad/di/vue'

import { rejectionText } from '../rejection/rejection-text'
import { DeleteParameterRefusal } from './delete-parameter-refusal'
import type { UseDeleteParameterRefusalResult } from './types'

export function useDeleteParameterRefusal(): UseDeleteParameterRefusalResult {
  const refusals = useService(DeleteParameterRefusal)
  return {
    text: (name) => refusals.refusal(name).map(rejectionText).getOrUndefined(),
    clear: (name) => {
      refusals.clear(name)
    },
  }
}
