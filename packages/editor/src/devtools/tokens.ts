import { createMultiToken } from '@keeb-cad/di'

import type { Inspectable } from './types'

export const inspectables = createMultiToken<Inspectable>('inspectables')
