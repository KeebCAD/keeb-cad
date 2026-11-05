import type { Container } from '@keeb-cad/di'

import { actions } from './tokens'
import type { ActionHandle, ActionInput, InputCheck } from './types'

export function registerAction<H extends ActionHandle>(
  container: Container,
  handle: H & InputCheck<ActionInput<H>, H['input']>,
): void {
  container.register(handle).useClass(handle)
  container.register(actions).useValue(handle)
}
