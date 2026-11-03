import type { Design, Frozen, Rejection } from '@keeb-cad/schema'
import type * as v from 'valibot'

import type { Writable } from '../patching/types'

// Methods rather than function properties, so a handle with a narrower input still fits the
// multi tokens' element type.
export interface CommandDefinition<
  Id extends string = string,
  Input extends v.GenericSchema = v.GenericSchema,
> {
  readonly kind: 'command'
  readonly id: Id
  readonly label: string
  readonly input: Input
  available(design: Frozen<Design>): boolean
  apply(draft: Writable<Design>, input: v.InferOutput<Input>): void | Rejection
}

export interface ActionDefinition<
  Id extends string = string,
  Input extends v.GenericSchema = v.GenericSchema,
> {
  readonly kind: 'action'
  readonly id: Id
  readonly label: string
  readonly input: Input
  available(design: Frozen<Design>): boolean
}

export type CommandSpec<Id extends string, Input extends v.GenericSchema> = Omit<
  CommandDefinition<Id, Input>,
  'kind' | 'available'
> &
  Partial<Pick<CommandDefinition<Id, Input>, 'available'>>

export type ActionSpec<Id extends string, Input extends v.GenericSchema> = Omit<
  ActionDefinition<Id, Input>,
  'kind' | 'available'
> &
  Partial<Pick<ActionDefinition<Id, Input>, 'available'>>
