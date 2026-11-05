import type { Container } from '@keeb-cad/di'

import { commands } from './tokens'
import type { CommandHandle, CommandInput, InputCheck } from './types'

export function registerCommand<H extends CommandHandle>(
  container: Container,
  handle: H & InputCheck<CommandInput<H>, H['input']>,
): void {
  container.register(handle).useClass(handle)
  container.register(commands).useValue(handle)
}
