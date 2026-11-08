import { useService } from '@keeb-cad/di/vue'

import { Invoke } from './invoke'
import type { InvokeFunctions } from './types'

export function useInvoke(): InvokeFunctions {
  const service = useService(Invoke)
  return { invoke: service.invoke.bind(service), available: service.available.bind(service) }
}
