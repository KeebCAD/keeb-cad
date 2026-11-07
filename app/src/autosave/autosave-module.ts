import type { Module } from '@keeb-cad/di'

import { Autosave } from './autosave'

export const autosaveModule: Module = {
  register(container) {
    container.register(Autosave).useClass(Autosave).eager()
  },
}
