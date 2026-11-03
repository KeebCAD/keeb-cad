import type * as v from 'valibot'

import { alwaysAvailable } from './always-available'
import type { CommandDefinition, CommandSpec } from './types'

export function defineCommand<const Id extends string, Input extends v.GenericSchema>(
  spec: CommandSpec<Id, Input>,
): CommandDefinition<Id, Input> {
  return { ...spec, kind: 'command', available: spec.available ?? alwaysAvailable }
}
