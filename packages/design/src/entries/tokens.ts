import { createMultiToken } from '@keeb-cad/di'

import type { ActionDefinition, CommandDefinition } from './types'

export const commands = createMultiToken<CommandDefinition>('commands')
export const actions = createMultiToken<ActionDefinition>('actions')
