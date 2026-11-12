import type { Container } from '@keeb-cad/di'

import type { FlowCheck, FlowHandle } from './types'

export function registerFlow<H extends FlowHandle>(
  container: Container,
  handle: H & FlowCheck<H>,
): void {
  container.register(handle).useClass(handle)
}
