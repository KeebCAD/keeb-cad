import type { Module } from '@keeb-cad/di'

import { CommandRegister } from './register'
import { DesignState } from './state'

/** Main's `design` services. The register resolves eagerly, so a duplicate id fails at startup. */
export const designModule: Module = {
  register(container) {
    container.register(DesignState).useClass(DesignState)
    container.register(CommandRegister).useClass(CommandRegister).eager()
  },
}
