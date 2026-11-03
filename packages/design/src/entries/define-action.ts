import type * as v from 'valibot'

import { alwaysAvailable } from './always-available'
import type { ActionDefinition, ActionSpec } from './types'

export function defineAction<const Id extends string, Input extends v.GenericSchema>(
  spec: ActionSpec<Id, Input>,
): ActionDefinition<Id, Input> {
  return { ...spec, kind: 'action', available: spec.available ?? alwaysAvailable }
}
