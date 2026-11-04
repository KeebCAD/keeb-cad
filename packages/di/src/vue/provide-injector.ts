import { type App, provide } from 'vue'

import { InjectorKey } from './injector-key'

import type { Injector } from '../types'

export function provideInjector(injector: Injector): void {
  provide(InjectorKey, injector)
}

export function provideInjectorOnApp(app: App, injector: Injector): void {
  app.provide(InjectorKey, injector)
}
