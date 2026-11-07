import type { Module } from '@keeb-cad/di'

import { Launch } from './launch'

export const launchModule: Module = {
  register(container) {
    container.register(Launch).useClass(Launch)
  },
}
