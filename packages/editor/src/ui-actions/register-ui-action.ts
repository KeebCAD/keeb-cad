import type { InputCheck } from '@keeb-cad/design'
import type { Container } from '@keeb-cad/di'

import { uiActions } from './tokens'
import type { UiActionHandle, UiActionInput } from './types'

export function registerUiAction<H extends UiActionHandle>(
  container: Container,
  handle: H & InputCheck<UiActionInput<H>, H['input']>,
): void {
  container.register(handle).useClass(handle)
  container.register(uiActions).useValue(handle)
}
