import { createMultiToken } from '@keeb-cad/di'

import type { ActionHandle, CommandHandle } from './types'

export const commands = createMultiToken<CommandHandle>('commands')
export const actions = createMultiToken<ActionHandle>('actions')
