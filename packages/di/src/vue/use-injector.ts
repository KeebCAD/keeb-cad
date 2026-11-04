import { inject as vueInject } from 'vue'

import { MissingInjectorProviderError } from '../errors/missing-injector-provider-error'
import { InjectorKey } from './injector-key'

import type { Injector } from '../types'

export function useInjector(): Injector {
  const injector = vueInject<Injector>(InjectorKey)
  if (!injector) throw new MissingInjectorProviderError()
  return injector
}
