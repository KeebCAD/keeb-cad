import type { Container } from '@keeb-cad/di'

import { inputBuilders } from './tokens'
import type { BuilderInputCheck, EntryHandle, InputBuilder } from './types'

export function registerInputBuilder<
  H extends EntryHandle,
  B extends new () => InputBuilder<unknown>,
>(
  container: Container,
  handle: H,
  builder: B & BuilderInputCheck<ReturnType<InstanceType<B>['input']>, H['input']>,
): void {
  container.register(builder).useClass(builder)
  container.register(inputBuilders).useValue({ handle, builder })
}
