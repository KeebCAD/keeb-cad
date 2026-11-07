import { createMultiToken } from '@keeb-cad/di'

import type { UiActionHandle } from './types'

export const uiActions = createMultiToken<UiActionHandle>('uiActions')
