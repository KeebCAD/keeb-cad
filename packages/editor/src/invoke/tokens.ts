import { createMultiToken } from '@keeb-cad/di'

import type { InputBuilderRegistration } from './types'

export const inputBuilders = createMultiToken<InputBuilderRegistration>('inputBuilders')
